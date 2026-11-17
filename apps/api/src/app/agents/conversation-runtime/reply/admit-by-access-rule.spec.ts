import { AgentSubscriberAccessEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { ResolvedAgentConfig } from '../../channels/agent-config-resolver.service';
import { AgentEventEnum } from '../../shared/enums/agent-event.enum';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import { SUBSCRIBER_ACCESS_RULE_REFUSED_REPLY } from '../../shared/util/agent-inbound-replies';
import type { ConversationTurn } from '../runtime/conversation-turn';
import { admitByAccessRule } from './admit-by-access-rule';

function makeLogger() {
  return { warn: sinon.stub() };
}

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

function makeDeps(overrides: { flagEnabled?: boolean } = {}) {
  const logger = makeLogger();
  const outboundGateway = {
    replyOnThread: sinon.stub().resolves({ messageId: 'out-1', platformThreadId: 'thread-1' }),
  };
  const conversationService = {
    getPrimaryChannel: sinon.stub().returns({ platformThreadId: 'thread-1', platform: 'slack' }),
  };
  const featureFlagsService = {
    getFlag: sinon.stub().resolves(overrides.flagEnabled ?? true),
  };

  return { logger, outboundGateway, conversationService, featureFlagsService };
}

describe('admitByAccessRule', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('admits open and restricted modes without reading the flag', async () => {
    for (const subscriberAccess of [AgentSubscriberAccessEnum.OPEN, AgentSubscriberAccessEnum.RESTRICTED]) {
      const deps = makeDeps();
      const turn = makeTurn({ config: makeConfig({ subscriberAccess }) });

      const admission = await admitByAccessRule({ turn, ...deps });

      expect(admission.admitted).to.equal(true);
      expect(deps.featureFlagsService.getFlag.called).to.equal(false);
    }
  });

  it('admits keyless email demos in rule mode', async () => {
    const deps = makeDeps();
    const turn = makeTurn({
      config: makeConfig({
        platform: AgentPlatformEnum.EMAIL,
        isKeyless: true,
        subscriberAccess: AgentSubscriberAccessEnum.RULE,
      }),
    });

    const admission = await admitByAccessRule({ turn, ...deps });

    expect(admission.admitted).to.equal(true);
    expect(deps.featureFlagsService.getFlag.called).to.equal(false);
  });

  it('refuses when the subscriber tokens flag is off', async () => {
    const deps = makeDeps({ flagEnabled: false });
    const turn = makeTurn({
      config: makeConfig({ subscriberAccess: AgentSubscriberAccessEnum.RULE }),
      subscriber: { subscriberId: 'sub-1', data: { tier: 'gold' } } as ConversationTurn['subscriber'],
    });

    const admission = await admitByAccessRule({ turn, ...deps });

    expect(admission.admitted).to.equal(false);
    if (!admission.admitted) {
      await admission.refuse();
    }

    expect(deps.logger.warn.calledWithMatch(sinon.match.any, 'Agent access rule refused inbound event')).to.equal(true);
    expect(deps.outboundGateway.replyOnThread.calledOnce).to.equal(true);
    expect(deps.outboundGateway.replyOnThread.firstCall.args[1]).to.deep.include({
      markdown: SUBSCRIBER_ACCESS_RULE_REFUSED_REPLY,
    });
  });

  it('refuses unresolved senders with generic copy and no rule refusal log', async () => {
    const deps = makeDeps();
    const turn = makeTurn({
      subscriberResolution: { outcome: 'not_found' },
      subscriber: null,
    });

    const admission = await admitByAccessRule({ turn, ...deps });

    expect(admission.admitted).to.equal(false);
    expect(deps.logger.warn.called).to.equal(false);
    if (!admission.admitted) {
      await admission.refuse();
    }

    expect(deps.outboundGateway.replyOnThread.calledOnce).to.equal(true);
    expect(deps.outboundGateway.replyOnThread.firstCall.args[1].markdown).to.not.equal(
      SUBSCRIBER_ACCESS_RULE_REFUSED_REPLY
    );
  });

  it('refuses when context lookup failed', async () => {
    const deps = makeDeps();
    const turn = makeTurn({
      contextLookupFailed: true,
      subscriber: { subscriberId: 'sub-1', data: { tier: 'gold' } } as ConversationTurn['subscriber'],
    });

    const admission = await admitByAccessRule({ turn, ...deps });

    expect(admission.admitted).to.equal(false);
    expect(deps.logger.warn.firstCall.args[1]).to.equal('Agent access rule refused inbound event');
    expect(deps.logger.warn.firstCall.args[0].reason).to.equal('context lookup failed');
  });

  it('admits when the rule matches and refuses when it does not', async () => {
    const deps = makeDeps();
    const allowedTurn = makeTurn({
      subscriber: { subscriberId: 'sub-1', data: { tier: 'gold' } } as ConversationTurn['subscriber'],
    });

    expect((await admitByAccessRule({ turn: allowedTurn, ...deps })).admitted).to.equal(true);

    const deniedAdmission = await admitByAccessRule({ turn: makeTurn(), ...deps });

    expect(deniedAdmission.admitted).to.equal(false);
    if (!deniedAdmission.admitted) {
      await deniedAdmission.refuse();
    }

    expect(deps.outboundGateway.replyOnThread.calledOnce).to.equal(true);
  });

  it('refuses when rule evaluation errors', async () => {
    const deps = makeDeps();
    const turn = makeTurn({ config: makeConfig({ accessRule: { log: 'x' } }) });

    const admission = await admitByAccessRule({ turn, ...deps });

    expect(admission.admitted).to.equal(false);
    expect(deps.logger.warn.firstCall.args[0].outcome).to.equal('error');
  });

  describe('refuse()', () => {
    const speakingEvents = [AgentEventEnum.ON_MESSAGE, AgentEventEnum.ON_MESSAGE_UPDATED, AgentEventEnum.ON_ACTION];
    const silentEvents = [AgentEventEnum.ON_REACTION, AgentEventEnum.ON_MESSAGE_DELETED];

    for (const event of speakingEvents) {
      it(`posts a reply for ${event}`, async () => {
        const deps = makeDeps({ flagEnabled: false });
        const turn = makeTurn({ event });

        const admission = await admitByAccessRule({ turn, ...deps });

        expect(admission.admitted).to.equal(false);
        if (!admission.admitted) {
          await admission.refuse();
        }

        expect(deps.outboundGateway.replyOnThread.calledOnce).to.equal(true);
      });
    }

    for (const event of silentEvents) {
      it(`stays silent for ${event}`, async () => {
        const deps = makeDeps({ flagEnabled: false });
        const message =
          event === AgentEventEnum.ON_MESSAGE_DELETED
            ? null
            : {
                id: 'msg-1',
                text: 'hello',
                author: { userId: 'U1', fullName: 'Ada', userName: 'ada', isBot: false },
              };
        const turn = makeTurn({ event, message });

        const admission = await admitByAccessRule({ turn, ...deps });

        expect(admission.admitted).to.equal(false);
        if (!admission.admitted) {
          await admission.refuse();
        }

        expect(deps.outboundGateway.replyOnThread.called).to.equal(false);
      });
    }
  });
});
