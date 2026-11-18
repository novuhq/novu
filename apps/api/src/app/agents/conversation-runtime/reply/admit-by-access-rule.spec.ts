import { AgentSubscriberAccessEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { ResolvedAgentConfig } from '../../channels/agent-config-resolver.service';
import { AgentEventEnum } from '../../shared/enums/agent-event.enum';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import {
  SUBSCRIBER_ACCESS_RULE_REFUSED_REPLY,
  UNRESOLVED_SUBSCRIBER_TRANSIENT_REPLY,
} from '../../shared/util/agent-inbound-replies';
import type { ConversationTurn } from '../runtime/conversation-turn';
import { admitByAccessRule, postAccessRuleRefusal } from './admit-by-access-rule';

function makeConfig(overrides: Partial<ResolvedAgentConfig> = {}): ResolvedAgentConfig {
  return {
    environmentId: 'env-1',
    organizationId: 'org-1',
    platform: AgentPlatformEnum.SLACK,
    integrationIdentifier: 'slack-main',
    integrationId: 'int-1',
    agentIdentifier: 'agent-1',
    subscriberAccess: AgentSubscriberAccessEnum.RULE,
    accessRule: { '==': [{ var: 'subscriber.data.tier' }, 'gold'] },
    acknowledgeOnReceived: false,
    replyPolicy: 'auto_reply',
    isKeyless: false,
    isManaged: false,
    ...overrides,
  } as ResolvedAgentConfig;
}

function makeSubscriber(tier: string): ConversationTurn['subscriber'] {
  return { subscriberId: 'sub-1', data: { tier } } as unknown as ConversationTurn['subscriber'];
}

function makeTurn(overrides: Partial<ConversationTurn> = {}): ConversationTurn {
  return {
    agentId: 'agent-mongo-1',
    agent: { _id: 'agent-mongo-1' },
    config: makeConfig(),
    conversation: {
      _id: 'conv-1',
      channels: [{ platform: 'slack', platformThreadId: 't1' }],
    } as ConversationTurn['conversation'],
    subscriber: makeSubscriber('silver'),
    context: null,
    subscriberResolution: { outcome: 'resolved', subscriberId: 'sub-1' },
    message: {
      id: 'msg-1',
      text: 'hello',
      author: { userId: 'U1', fullName: 'Ada', userName: 'ada', isBot: false },
    } as unknown as ConversationTurn['message'],
    event: AgentEventEnum.ON_MESSAGE,
    thread: {
      id: 'thread-1',
      channelId: 'C1',
      isDM: true,
      post: sinon.stub().resolves({ id: 'reply-1', threadId: 'thread-1' }),
    } as unknown as ConversationTurn['thread'],
    platformThreadId: 'thread-1',
    ...overrides,
  };
}

function makeDeps() {
  return {
    logger: { warn: sinon.stub() },
    outboundGateway: {
      replyOnThread: sinon.stub().resolves({ messageId: 'out-1', platformThreadId: 'thread-1' }),
    },
    conversationService: {
      getPrimaryChannel: sinon.stub().returns({ platformThreadId: 'thread-1', platform: 'slack' }),
    },
    featureFlagsService: { getFlag: sinon.stub().resolves(true) },
  };
}

describe('admitByAccessRule', () => {
  afterEach(() => {
    sinon.restore();
  });

  async function refuseAndReply(turn: ConversationTurn) {
    const deps = makeDeps();
    const admission = await admitByAccessRule(turn, deps);
    expect(admission.admitted).to.equal(false);
    if (!admission.admitted) {
      await postAccessRuleRefusal(turn, admission.refusal, deps);
    }

    return deps.outboundGateway.replyOnThread.firstCall?.args[1]?.markdown;
  }

  it('tells a subscriber the rule allows to try again when the context lookup failed', async () => {
    const reply = await refuseAndReply(
      makeTurn({
        contextLookupFailed: true,
        subscriber: makeSubscriber('gold'),
      })
    );

    expect(reply).to.equal(UNRESOLVED_SUBSCRIBER_TRANSIENT_REPLY);
  });

  it('refuses a keyless email demo whose subscriber the rule denies', async () => {
    const reply = await refuseAndReply(
      makeTurn({ config: makeConfig({ platform: AgentPlatformEnum.EMAIL, isKeyless: true }) })
    );

    expect(reply).to.equal(SUBSCRIBER_ACCESS_RULE_REFUSED_REPLY);
  });

  it('replies to a refused edit', async () => {
    const reply = await refuseAndReply(makeTurn({ event: AgentEventEnum.ON_MESSAGE_UPDATED }));

    expect(reply).to.equal(SUBSCRIBER_ACCESS_RULE_REFUSED_REPLY);
  });
});
