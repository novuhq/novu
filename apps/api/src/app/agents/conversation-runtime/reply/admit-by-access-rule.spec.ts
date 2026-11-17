import { AgentSubscriberAccessEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { ResolvedAgentConfig } from '../../channels/agent-config-resolver.service';
import { AgentEventEnum } from '../../shared/enums/agent-event.enum';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import { SUBSCRIBER_ACCESS_RULE_REFUSED_REPLY } from '../../shared/util/agent-inbound-replies';
import type { ConversationTurn } from '../runtime/conversation-turn';
import { admitByAccessRule } from './admit-by-access-rule';

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

function makeTurn(overrides: Partial<ConversationTurn> = {}): ConversationTurn {
  return {
    agentId: 'agent-mongo-1',
    agent: { _id: 'agent-mongo-1' },
    config: makeConfig(),
    conversation: {
      _id: 'conv-1',
      channels: [{ platform: 'slack', platformThreadId: 't1' }],
    } as ConversationTurn['conversation'],
    subscriber: { subscriberId: 'sub-1', data: { tier: 'silver' } } as ConversationTurn['subscriber'],
    context: null,
    subscriberResolution: { outcome: 'resolved', subscriberId: 'sub-1' },
    message: {
      id: 'msg-1',
      text: 'hello',
      author: { userId: 'U1', fullName: 'Ada', userName: 'ada', isBot: false },
    },
    event: AgentEventEnum.ON_MESSAGE,
    thread: {
      id: 'thread-1',
      channelId: 'C1',
      isDM: true,
      post: sinon.stub().resolves({ id: 'reply-1', threadId: 'thread-1' }),
    } as ConversationTurn['thread'],
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

  it('admits keyless email demos in rule mode', async () => {
    const turn = makeTurn({ config: makeConfig({ platform: AgentPlatformEnum.EMAIL, isKeyless: true }) });

    expect((await admitByAccessRule({ turn, ...makeDeps() })).admitted).to.equal(true);
  });

  it('refuses a subscriber the rule allows when the context lookup failed', async () => {
    const turn = makeTurn({
      contextLookupFailed: true,
      subscriber: { subscriberId: 'sub-1', data: { tier: 'gold' } } as ConversationTurn['subscriber'],
    });

    expect((await admitByAccessRule({ turn, ...makeDeps() })).admitted).to.equal(false);
  });

  it('replies to a refused edit', async () => {
    const deps = makeDeps();
    const admission = await admitByAccessRule({
      turn: makeTurn({ event: AgentEventEnum.ON_MESSAGE_UPDATED }),
      ...deps,
    });

    expect(admission.admitted).to.equal(false);
    if (!admission.admitted) {
      await admission.refuse();
    }

    expect(deps.outboundGateway.replyOnThread.firstCall.args[1]).to.deep.include({
      markdown: SUBSCRIBER_ACCESS_RULE_REFUSED_REPLY,
    });
  });
});
