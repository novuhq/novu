import { AgentSubscriberAccessEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { ResolvedAgentConfig } from '../../channels/agent-config-resolver.service';
import { AgentEventEnum } from '../../shared/enums/agent-event.enum';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import type { SubscriberResolution } from '../../shared/types/subscriber-resolution';
import {
  SUBSCRIBER_ACCESS_RULE_REFUSED_REPLY,
  UNRESOLVED_SUBSCRIBER_ACCESS_REPLY,
  UNRESOLVED_SUBSCRIBER_TRANSIENT_REPLY,
} from '../../shared/util/agent-inbound-replies';
import type { ConversationTurn } from '../runtime/conversation-turn';
import { decideInboundAccess, type InboundAccess, type InboundSender, replyToRefusal } from './inbound-access';

const GOLD_RULE = { '==': [{ var: 'subscriber.data.tier' }, 'gold'] };

function makeConfig(overrides: Partial<ResolvedAgentConfig> = {}): ResolvedAgentConfig {
  return {
    agentId: 'agent-mongo-1',
    environmentId: 'env-1',
    organizationId: 'org-1',
    platform: AgentPlatformEnum.SLACK,
    integrationIdentifier: 'slack-main',
    integrationId: 'int-1',
    agentIdentifier: 'agent-1',
    subscriberAccess: AgentSubscriberAccessEnum.OPEN,
    acknowledgeOnReceived: false,
    replyPolicy: 'auto_reply',
    isKeyless: false,
    isManaged: false,
    ...overrides,
  } as ResolvedAgentConfig;
}

const ruleConfig = (overrides: Partial<ResolvedAgentConfig> = {}) =>
  makeConfig({ subscriberAccess: AgentSubscriberAccessEnum.RULE, accessRule: GOLD_RULE, ...overrides });

function senderWithTier(tier: string): InboundSender {
  return {
    subscriber: { subscriberId: 'sub-1', data: { tier } } as unknown as InboundSender['subscriber'],
    context: null,
  };
}

const RESOLVED: SubscriberResolution = { outcome: 'resolved', subscriberId: 'sub-1' };
const NOT_FOUND: SubscriberResolution = { outcome: 'not_found' };
const NOBODY: InboundSender = { subscriber: null, context: null };

function decide(
  overrides: Partial<Parameters<typeof decideInboundAccess>[0]> = {},
  tokensEnabled = true
): Promise<InboundAccess> {
  return decideInboundAccess(
    {
      event: AgentEventEnum.ON_MESSAGE,
      config: makeConfig(),
      resolution: RESOLVED,
      sender: senderWithTier('gold'),
      emailSenderUnverified: false,
      ...overrides,
    },
    { getFlag: sinon.stub().resolves(tokensEnabled) }
  );
}

const ADMIT: InboundAccess = { verdict: 'admit' };
const DROP: InboundAccess = { verdict: 'drop' };
const UNRESOLVED: InboundAccess = { verdict: 'refuse', refusal: { kind: 'unresolved' } };

describe('decideInboundAccess', () => {
  describe('in rule mode', () => {
    it('admits a subscriber the rule allows and refuses one it denies', async () => {
      expect(await decide({ config: ruleConfig() })).to.deep.equal(ADMIT);
      expect(await decide({ config: ruleConfig(), sender: senderWithTier('silver') })).to.deep.equal({
        verdict: 'refuse',
        refusal: { kind: 'denied' },
      });
    });

    it('refuses an unknown sender as unresolved', async () => {
      expect(await decide({ config: ruleConfig(), resolution: NOT_FOUND, sender: NOBODY })).to.deep.equal(UNRESOLVED);
    });

    it('refuses with an error when it cannot decide', async () => {
      const cases: Array<[string, Promise<InboundAccess>]> = [
        ['flag off', decide({ config: ruleConfig() }, false)],
        [
          'context lookup failed',
          decide({ config: ruleConfig(), sender: { ...senderWithTier('gold'), contextLookupFailed: true } }),
        ],
        ['no subscriber', decide({ config: ruleConfig(), resolution: undefined, sender: NOBODY })],
        ['invalid rule', decide({ config: ruleConfig({ accessRule: { log: 'x' } as never }) })],
      ];

      for (const [name, access] of cases) {
        const result = await access;
        expect(result.verdict, name).to.equal('refuse');
        expect(result.verdict === 'refuse' && result.refusal.kind, name).to.equal('error');
      }
    });

    it('applies the rule to a keyless email demo', async () => {
      const config = ruleConfig({ platform: AgentPlatformEnum.EMAIL, isKeyless: true });

      expect((await decide({ config, sender: senderWithTier('silver') })).verdict).to.equal('refuse');
    });

    for (const event of Object.values(AgentEventEnum)) {
      it(`refuses a denied ${event}`, async () => {
        expect((await decide({ event, config: ruleConfig(), sender: senderWithTier('silver') })).verdict).to.equal(
          'refuse'
        );
      });
    }
  });

  describe('in restricted mode', () => {
    const config = makeConfig({ subscriberAccess: AgentSubscriberAccessEnum.RESTRICTED });

    it('admits a known subscriber and an event with no platform user', async () => {
      expect(await decide({ config })).to.deep.equal(ADMIT);
      expect(await decide({ config, resolution: undefined, sender: NOBODY })).to.deep.equal(ADMIT);
    });

    for (const event of Object.values(AgentEventEnum)) {
      it(`refuses an unknown sender's ${event}`, async () => {
        expect(await decide({ event, config, resolution: NOT_FOUND, sender: NOBODY })).to.deep.equal(UNRESOLVED);
      });
    }

    it('admits a keyless email demo from an unknown sender', async () => {
      const keyless = makeConfig({
        subscriberAccess: AgentSubscriberAccessEnum.RESTRICTED,
        platform: AgentPlatformEnum.EMAIL,
        isKeyless: true,
      });

      expect(await decide({ config: keyless, resolution: NOT_FOUND, sender: NOBODY })).to.deep.equal(ADMIT);
    });
  });

  describe('in open mode', () => {
    it('admits an unknown sender to a custom-code agent and drops it for a managed one', async () => {
      expect(await decide({ resolution: NOT_FOUND, sender: NOBODY })).to.deep.equal(ADMIT);
      expect(
        await decide({ config: makeConfig({ isManaged: true }), resolution: NOT_FOUND, sender: NOBODY })
      ).to.deep.equal(DROP);
    });

    it('refuses an unverified email sender and a sender whose resolution failed', async () => {
      const email = makeConfig({ platform: AgentPlatformEnum.EMAIL });

      expect(
        await decide({ config: email, resolution: NOT_FOUND, sender: NOBODY, emailSenderUnverified: true })
      ).to.deep.equal(UNRESOLVED);
      expect(await decide({ resolution: { outcome: 'error', err: new Error('db') }, sender: NOBODY })).to.deep.equal(
        UNRESOLVED
      );
    });
  });
});

describe('replyToRefusal', () => {
  function makeTurn(overrides: Partial<ConversationTurn> = {}): ConversationTurn {
    return {
      agentId: 'agent-mongo-1',
      agent: { _id: 'agent-mongo-1' },
      config: ruleConfig(),
      conversation: { _id: 'conv-1', channels: [{ platform: 'slack', platformThreadId: 't1' }] } as never,
      subscriber: null,
      context: null,
      subscriberResolution: NOT_FOUND,
      message: { id: 'msg-1', text: 'hello', author: { userId: 'U1' } } as never,
      event: AgentEventEnum.ON_MESSAGE,
      thread: { id: 'thread-1', channelId: 'C1', isDM: true } as never,
      platformThreadId: 'thread-1',
      ...overrides,
    };
  }

  async function replyFor(
    refusal: Parameters<typeof replyToRefusal>[1],
    turn = makeTurn(),
    silent?: boolean
  ): Promise<string | undefined> {
    const replyOnThread = sinon.stub().resolves(undefined);
    await replyToRefusal(turn, refusal, {
      logger: { warn: sinon.stub() },
      outboundGateway: { replyOnThread },
      conversationService: { getPrimaryChannel: sinon.stub().returns({ platform: 'slack' }) } as never,
      emailSenderUnverified: false,
      silent,
    });

    return replyOnThread.firstCall?.args[1]?.markdown;
  }

  it('answers each refusal with its copy', async () => {
    expect(await replyFor({ kind: 'unresolved' })).to.equal(UNRESOLVED_SUBSCRIBER_ACCESS_REPLY);
    expect(await replyFor({ kind: 'denied' })).to.equal(SUBSCRIBER_ACCESS_RULE_REFUSED_REPLY);
    expect(await replyFor({ kind: 'error', reason: 'x' })).to.equal(UNRESOLVED_SUBSCRIBER_TRANSIENT_REPLY);
  });

  it('answers a refused edit and click, but not a delete, a reaction, or a silent caller', async () => {
    const replyToEvent = (event: AgentEventEnum) => replyFor({ kind: 'denied' }, makeTurn({ event }));

    expect(await replyToEvent(AgentEventEnum.ON_MESSAGE_UPDATED)).to.equal(SUBSCRIBER_ACCESS_RULE_REFUSED_REPLY);
    expect(await replyToEvent(AgentEventEnum.ON_ACTION)).to.equal(SUBSCRIBER_ACCESS_RULE_REFUSED_REPLY);
    expect(await replyToEvent(AgentEventEnum.ON_MESSAGE_DELETED)).to.equal(undefined);
    expect(await replyToEvent(AgentEventEnum.ON_REACTION)).to.equal(undefined);
    expect(await replyFor({ kind: 'denied' }, makeTurn(), true)).to.equal(undefined);
  });
});
