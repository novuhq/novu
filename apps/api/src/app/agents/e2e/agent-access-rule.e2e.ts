import { createContextHash, createHash } from '@novu/application-generic';
import {
  AgentRepository,
  ChannelConnectionRepository,
  ContextRepository,
  IntegrationRepository,
  SubscriberRepository,
} from '@novu/dal';
import { ChannelTypeEnum, ChatProviderIdEnum, type ContextPayload, InAppProviderIdEnum } from '@novu/shared';
import { testServer } from '@novu/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import { AgentConfigResolver } from '../channels/agent-config-resolver.service';
import { OutboundGateway } from '../conversation-runtime/egress/outbound.gateway';
import { AgentInboundHandler } from '../conversation-runtime/ingress/inbound-turn.handler';
import {
  type AgentExecutionParams,
  BridgeExecutorService,
} from '../conversation-runtime/runtime/bridge-executor.service';
import { AgentEventEnum } from '../shared/enums/agent-event.enum';
import {
  SUBSCRIBER_ACCESS_RULE_REFUSED_REPLY,
  UNRESOLVED_SUBSCRIBER_ACCESS_REPLY,
  UNRESOLVED_SUBSCRIBER_TRANSIENT_REPLY,
} from '../shared/util/agent-inbound-replies';
import {
  AgentTestContext,
  activityRepository,
  conversationRepository,
  seedChannelEndpoint,
  setupAgentTestContext,
} from './helpers/agent-test-setup';

const POLL_TIMEOUT_MS = 10_000;
const POLL_INTERVAL_MS = 50;
const SETTLE_MS = 300;

async function pollFor<T>(fn: () => T | null | undefined | Promise<T | null | undefined>): Promise<T> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      const result = await fn();
      if (result) return result;
    } catch (err) {
      lastError = err;
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error(
    `pollFor timed out after ${POLL_TIMEOUT_MS}ms${lastError ? `; last error: ${(lastError as Error).message}` : ''}`
  );
}

const agentRepository = new AgentRepository();
const integrationRepository = new IntegrationRepository();
const subscriberRepository = new SubscriberRepository();

const PAID_PLAN_RULE = { in: [{ var: 'context.tenant.data.plan' }, ['pro', 'enterprise']] };

function blockListRule(agentIdentifier: string) {
  return { '!': { in: [agentIdentifier, { var: 'subscriber.data.blockedAgents' }] } };
}

describe('Agent access rule #novu-v2', () => {
  let ctx: AgentTestContext;
  let bridgeCalls: AgentExecutionParams[];

  before(() => {
    process.env.IS_AGENT_WEB_CHAT_ENABLED = 'true';
    process.env.IS_CONVERSATIONAL_AGENTS_ENABLED = 'true';
  });

  after(() => {
    delete process.env.IS_AGENT_WEB_CHAT_ENABLED;
    delete process.env.IS_CONVERSATIONAL_AGENTS_ENABLED;
    delete process.env.IS_SUBSCRIBER_TOKENS_ENABLED;
  });

  beforeEach(async () => {
    process.env.IS_SUBSCRIBER_TOKENS_ENABLED = 'true';
    ctx = await setupAgentTestContext();

    bridgeCalls = [];
    const bridgeExecutor = testServer.getService(BridgeExecutorService);
    sinon.stub(bridgeExecutor, 'execute').callsFake(async (params: AgentExecutionParams) => {
      bridgeCalls.push(params);
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  function patchBehavior(behavior: Record<string, unknown>) {
    return ctx.session.testAgent.patch(`/v1/agents/${ctx.agentIdentifier}`).send({ behavior });
  }

  async function setRule(accessRule: Record<string, unknown>) {
    const res = await patchBehavior({ subscriberAccess: 'rule', accessRule });
    expect(res.status, JSON.stringify(res.body)).to.equal(200);
  }

  async function storedBehavior() {
    const res = await ctx.session.testAgent.get(`/v1/agents/${ctx.agentIdentifier}`);
    expect(res.status).to.equal(200);

    return res.body.data.behavior;
  }

  describe('saving a rule', () => {
    it('stores a valid rule, returns it, and clears it when the agent leaves rule mode', async () => {
      const res = await patchBehavior({ subscriberAccess: 'rule', accessRule: PAID_PLAN_RULE });

      expect(res.status).to.equal(200);
      expect(res.body.data.behavior.subscriberAccess).to.equal('rule');
      expect(res.body.data.behavior.accessRule).to.deep.equal(PAID_PLAN_RULE);

      const unrelated = await patchBehavior({ acknowledgeOnReceived: false });
      expect(unrelated.status).to.equal(200);
      expect((await storedBehavior())?.accessRule).to.deep.equal(PAID_PLAN_RULE);

      const restricted = await patchBehavior({ subscriberAccess: 'restricted' });
      expect(restricted.status).to.equal(200);
      expect(restricted.body.data.behavior.accessRule).to.equal(undefined);
      expect((await storedBehavior())?.accessRule).to.equal(undefined);
    });

    it('rejects rule mode without a rule, and a rule without rule mode', async () => {
      const missing = await patchBehavior({ subscriberAccess: 'rule' });
      expect(missing.status).to.equal(400);

      const orphan = await patchBehavior({ subscriberAccess: 'open', accessRule: PAID_PLAN_RULE });
      expect(orphan.status).to.equal(400);

      expect((await storedBehavior())?.subscriberAccess).to.equal('open');
      expect((await storedBehavior())?.accessRule).to.equal(undefined);
    });

    it('rejects clearing the rule with null while the agent stays in rule mode', async () => {
      await setRule(PAID_PLAN_RULE);

      const res = await patchBehavior({ accessRule: null });

      expect(res.status).to.equal(422);
      expect((await storedBehavior())?.accessRule).to.deep.equal(PAID_PLAN_RULE);
    });

    it('rejects rules that are not JSON Logic over subscriber and context', async () => {
      const invalidRules: Record<string, unknown>[] = [
        { log: { var: 'subscriber.email' } },
        { '==': [{ var: 'workflow.name' }, 'x'] },
        { '==': [{ var: 'payload.region' }, 'eu'] },
        { '==': [{ var: 'subscriber.email' }, 'a@b.co'], '!=': [{ var: 'subscriber.email' }, 'c@d.co'] },
        {},
        { '==': [{ var: 'subscriber.constructor.name' }, 'Object'] },
        { notNull: { var: 'subscriber.toString' } },
        { notNull: { var: 'subscriber.data.__proto__' } },
        { notNull: { var: 'context.tenant.constructor' } },
        { '==': [{ var: 'subscriber.channels.0.credentials.apiKey' }, 'secret'] },
      ];

      for (const accessRule of invalidRules) {
        const res = await patchBehavior({ subscriberAccess: 'rule', accessRule });
        expect(res.status, `rule ${JSON.stringify(accessRule)} -> ${JSON.stringify(res.body)}`).to.equal(400);
      }

      expect((await storedBehavior())?.subscriberAccess).to.equal('open');
    });

    it('rejects rules too large or too deeply nested to load on every inbound event', async () => {
      const tenantIds = Array.from({ length: 2000 }, (_, i) => `tenant-${i}`);
      let deepRule: Record<string, unknown> = { notNull: { var: 'subscriber.email' } };
      for (let level = 0; level < 40; level++) {
        deepRule = { '!': deepRule };
      }

      for (const accessRule of [{ in: [{ var: 'context.tenant.id' }, tenantIds] }, deepRule]) {
        const res = await patchBehavior({ subscriberAccess: 'rule', accessRule });

        expect(res.status, JSON.stringify(res.body).slice(0, 300)).to.equal(400);
      }

      expect((await storedBehavior())?.subscriberAccess).to.equal('open');
    });

    it('accepts an unrelated update on an agent whose stored rule no longer validates', async () => {
      await agentRepository.update(
        { _id: ctx.agentId, _environmentId: ctx.session.environment._id },
        { $set: { 'behavior.subscriberAccess': 'rule', 'behavior.accessRule': { log: 'not allowed' } } }
      );

      const res = await patchBehavior({ acknowledgeOnReceived: false });

      expect(res.status, JSON.stringify(res.body)).to.equal(200);
    });

    it('refuses rule mode while the signed subscriber tokens flag is off', async () => {
      process.env.IS_SUBSCRIBER_TOKENS_ENABLED = 'false';

      const res = await patchBehavior({ subscriberAccess: 'rule', accessRule: PAID_PLAN_RULE });

      expect(res.status).to.equal(403);
      expect((await storedBehavior())?.subscriberAccess).to.equal('open');
    });
  });

  describe('Web Chat', () => {
    async function linkWebChat() {
      const res = await ctx.session.testAgent.post(`/v1/agents/${ctx.agentIdentifier}/integrations`).send({
        providerId: ChatProviderIdEnum.NovuWebChat,
      });
      expect(res.status).to.equal(201);
    }

    async function enforceInboxHmac() {
      await integrationRepository.update(
        {
          _environmentId: ctx.session.environment._id,
          _organizationId: ctx.session.organization._id,
          providerId: InAppProviderIdEnum.Novu,
          channel: ChannelTypeEnum.IN_APP,
        },
        { $set: { 'credentials.hmac': true } }
      );
    }

    async function openSession(context?: ContextPayload) {
      const secretKey = ctx.session.environment.apiKeys[0].key;
      const res = await ctx.session.testAgent.post('/v1/inbox/session').send({
        applicationIdentifier: ctx.session.environment.identifier,
        subscriberId: ctx.session.subscriberId,
        subscriberHash: createHash(secretKey, ctx.session.subscriberId),
        ...(context ? { context, contextHash: createContextHash(secretKey, context) } : {}),
      });
      expect(res.status, JSON.stringify(res.body)).to.equal(201);

      return res.body.data.token as string;
    }

    async function send(token: string, text: string, conversationIdentifier?: string) {
      const res = await ctx.session.testAgent
        .post('/v1/web-chat/conversations')
        .set('Authorization', `Bearer ${token}`)
        .send({ agentId: ctx.agentIdentifier, text, ...(conversationIdentifier ? { conversationIdentifier } : {}) });
      expect(res.status, JSON.stringify(res.body)).to.equal(201);

      return res.body.data.identifier as string;
    }

    async function conversationId(identifier: string) {
      const conversation = await pollFor(() =>
        conversationRepository.findOne({ identifier, _environmentId: ctx.session.environment._id }, { _id: 1 })
      );

      return conversation._id;
    }

    async function waitForRefusal(identifier: string, reply = SUBSCRIBER_ACCESS_RULE_REFUSED_REPLY) {
      const _conversationId = await conversationId(identifier);

      return pollFor(() =>
        activityRepository.findOne(
          { _environmentId: ctx.session.environment._id, _conversationId, content: reply },
          { _id: 1 }
        )
      );
    }

    async function waitForBridgeCalls(count: number) {
      await pollFor(() => bridgeCalls.length >= count);
      await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
      expect(bridgeCalls.length).to.equal(count);
    }

    it('lets a paying tenant talk to the agent and refuses its next message after the tenant downgrades', async () => {
      await linkWebChat();
      await enforceInboxHmac();
      const tenantId = `acme-${Date.now()}`;
      await setRule(PAID_PLAN_RULE);
      const token = await openSession({ tenant: { id: tenantId, data: { plan: 'pro' } } });

      const identifier = await send(token, 'Hi, I am on Pro');
      await waitForBridgeCalls(1);
      expect(bridgeCalls[0].context).to.deep.include({ tenant: { id: tenantId, data: { plan: 'pro' } } });

      const downgrade = await ctx.session.testAgent
        .patch(`/v2/contexts/tenant/${tenantId}`)
        .send({ data: { plan: 'free' } });
      expect(downgrade.status, JSON.stringify(downgrade.body)).to.equal(200);

      await send(token, 'Still there?', identifier);
      await waitForRefusal(identifier);
      await waitForBridgeCalls(1);
    });

    it('refuses an unsigned session whose tenant the agent cannot trust', async () => {
      await linkWebChat();
      await setRule(PAID_PLAN_RULE);
      const res = await ctx.session.testAgent.post('/v1/inbox/session').send({
        applicationIdentifier: ctx.session.environment.identifier,
        subscriberId: ctx.session.subscriberId,
        context: { tenant: { id: `forged-${Date.now()}`, data: { plan: 'enterprise' } } },
      });
      expect(res.status).to.equal(201);

      const identifier = await send(res.body.data.token, 'Let me in');

      await waitForRefusal(identifier);
      await waitForBridgeCalls(0);
    });

    it('lets in a subscriber with no block list and refuses the next message once the agent is blocked', async () => {
      await linkWebChat();
      await setRule(blockListRule(ctx.agentIdentifier));
      const token = await openSession();

      const identifier = await send(token, 'First message');
      await waitForBridgeCalls(1);

      const blocked = await ctx.session.testAgent
        .patch(`/v2/subscribers/${ctx.session.subscriberId}`)
        .send({ data: { blockedAgents: [ctx.agentIdentifier] } });
      expect(blocked.status, JSON.stringify(blocked.body)).to.equal(200);

      await send(token, 'Second message', identifier);
      await waitForRefusal(identifier);
      await waitForBridgeCalls(1);
    });

    it('refuses a previously allowed sender after the subscriber tokens flag is turned off at runtime', async () => {
      await linkWebChat();
      await enforceInboxHmac();
      await setRule(PAID_PLAN_RULE);
      const token = await openSession({ tenant: { id: `flag-off-${Date.now()}`, data: { plan: 'pro' } } });

      const identifier = await send(token, 'Allowed while flag is on');
      await waitForBridgeCalls(1);

      process.env.IS_SUBSCRIBER_TOKENS_ENABLED = 'false';

      await send(token, 'Blocked after flag off', identifier);
      await waitForRefusal(identifier, UNRESOLVED_SUBSCRIBER_TRANSIENT_REPLY);
      await waitForBridgeCalls(1);
    });

    it('refuses every message when the stored rule cannot be evaluated', async () => {
      await linkWebChat();
      await agentRepository.update(
        { _id: ctx.agentId, _environmentId: ctx.session.environment._id },
        { $set: { 'behavior.subscriberAccess': 'rule', 'behavior.accessRule': { log: 'not allowed' } } }
      );
      const token = await openSession();

      const identifier = await send(token, 'Hello');

      await waitForRefusal(identifier, UNRESOLVED_SUBSCRIBER_TRANSIENT_REPLY);
      await waitForBridgeCalls(0);
    });
  });

  describe('Slack', () => {
    let replies: string[];

    beforeEach(() => {
      replies = [];
      sinon.stub(testServer.getService(OutboundGateway), 'replyOnThread').callsFake(async (_thread, msg) => {
        replies.push((msg as { markdown: string }).markdown);

        return undefined as never;
      });
    });

    function thread(id: string) {
      return {
        id,
        channelId: 'C_ACCESS_RULE',
        isDM: true,
        startTyping: async () => {},
        subscribe: async () => {},
        unsubscribe: async () => {},
        post: async () => ({}),
        toJSON: () => ({ id, platform: 'slack', channelId: 'C_ACCESS_RULE' }),
      };
    }

    async function sendSlack(threadId: string, userId: string, text: string) {
      const config = await testServer.getService(AgentConfigResolver).resolve(ctx.agentId, ctx.integrationIdentifier);
      const message = {
        id: `msg-${Date.now()}-${Math.random()}`,
        text,
        author: { userId, fullName: 'Slack User', userName: 'slackuser', isBot: false },
        isMention: true,
        metadata: { dateSent: new Date() },
        raw: { type: 'message', team: 'W_TEAM', user: userId, text },
      };

      await testServer
        .getService(AgentInboundHandler)
        .handle(ctx.agentId, config, thread(threadId) as never, message as never, AgentEventEnum.ON_MESSAGE);

      return message;
    }

    async function clickSlack(threadId: string, userId: string) {
      const config = await testServer.getService(AgentConfigResolver).resolve(ctx.agentId, ctx.integrationIdentifier);

      await testServer
        .getService(AgentInboundHandler)
        .handleAction(
          ctx.agentId,
          config,
          thread(threadId) as never,
          { id: 'issue-refund', value: 'order-42' },
          userId
        );
    }

    async function reactSlack(threadId: string, userId: string, message: Awaited<ReturnType<typeof sendSlack>>) {
      const config = await testServer.getService(AgentConfigResolver).resolve(ctx.agentId, ctx.integrationIdentifier);

      await testServer.getService(AgentInboundHandler).handleReaction(ctx.agentId, config, {
        emoji: {
          name: 'thumbs_up',
          toJSON: () => '{{emoji:thumbs_up}}',
          toString: () => '{{emoji:thumbs_up}}',
        } as never,
        added: true,
        messageId: message.id,
        message: message as never,
        thread: thread(threadId) as never,
        user: { userId },
        raw: { type: 'reaction_added', user: userId, reaction: 'thumbsup', item: { type: 'message', ts: message.id } },
      });
    }

    it('applies the rule to button clicks and reactions, refusing the click with a reply and the reaction silently', async () => {
      const subscriberId = `slack-rule-events-${Date.now()}`;
      await subscriberRepository.create({
        _environmentId: ctx.session.environment._id,
        _organizationId: ctx.session.organization._id,
        subscriberId,
        data: { tier: 'gold' },
      });
      await seedChannelEndpoint(ctx, 'U_RULE_EVENTS', subscriberId);
      await setRule({ '==': [{ var: 'subscriber.data.tier' }, 'gold'] });
      const threadId = `D_RULE_EVENTS_${Date.now()}`;

      const message = await sendSlack(threadId, 'U_RULE_EVENTS', 'hello');
      await clickSlack(threadId, 'U_RULE_EVENTS');
      await reactSlack(threadId, 'U_RULE_EVENTS', message);
      expect(bridgeCalls.map((call) => call.event)).to.deep.equal(['onMessage', 'onAction', 'onReaction']);
      expect(replies).to.deep.equal([]);

      await subscriberRepository.update(
        { _environmentId: ctx.session.environment._id, subscriberId },
        { $set: { 'data.tier': 'silver' } }
      );

      await clickSlack(threadId, 'U_RULE_EVENTS');
      await reactSlack(threadId, 'U_RULE_EVENTS', message);
      expect(bridgeCalls).to.have.length(3);
      expect(replies).to.deep.equal([SUBSCRIBER_ACCESS_RULE_REFUSED_REPLY]);
    });

    it('applies a workspace tenant rule to reactions, whose Slack payload carries no workspace id', async () => {
      const tenantId = `acme-slack-${Date.now()}`;
      await new ContextRepository().create({
        _environmentId: ctx.session.environment._id,
        _organizationId: ctx.session.organization._id,
        type: 'tenant',
        id: tenantId,
        key: `tenant:${tenantId}`,
        data: { plan: 'pro' },
      });
      await new ChannelConnectionRepository().update(
        {
          _environmentId: ctx.session.environment._id,
          _organizationId: ctx.session.organization._id,
          integrationIdentifier: ctx.integrationIdentifier,
          'workspace.id': 'W_TEAM',
        },
        { $set: { contextKeys: [`tenant:${tenantId}`] } }
      );
      const subscriberId = `slack-rule-tenant-${Date.now()}`;
      await subscriberRepository.create({
        _environmentId: ctx.session.environment._id,
        _organizationId: ctx.session.organization._id,
        subscriberId,
      });
      await seedChannelEndpoint(ctx, 'U_RULE_TENANT', subscriberId);
      await setRule(PAID_PLAN_RULE);
      const threadId = `D_RULE_TENANT_${Date.now()}`;

      const message = await sendSlack(threadId, 'U_RULE_TENANT', 'hello');
      await reactSlack(threadId, 'U_RULE_TENANT', message);

      expect(bridgeCalls.map((call) => call.event)).to.deep.equal(['onMessage', 'onReaction']);
      expect(bridgeCalls[1].context).to.deep.include({ tenant: { id: tenantId, data: { plan: 'pro' } } });
      expect(replies).to.deep.equal([]);
    });

    it('compares == and != strictly, so another tenant or a missing field never matches', async () => {
      const subscriberId = `slack-rule-strict-${Date.now()}`;
      await subscriberRepository.create({
        _environmentId: ctx.session.environment._id,
        _organizationId: ctx.session.organization._id,
        subscriberId,
        data: { tenant: 'acme-1' },
      });
      await seedChannelEndpoint(ctx, 'U_RULE_STRICT', subscriberId);
      await setRule({
        and: [
          { '==': [{ var: 'subscriber.data.tenant' }, 'acme-1'] },
          { '!=': [{ var: 'subscriber.data.banned' }, true] },
        ],
      });
      const threadId = `D_RULE_STRICT_${Date.now()}`;

      await sendSlack(threadId, 'U_RULE_STRICT', 'hello');
      expect(bridgeCalls).to.have.length(1);

      await subscriberRepository.update(
        { _environmentId: ctx.session.environment._id, subscriberId },
        { $set: { 'data.tenant': 'globex-1' } }
      );
      await sendSlack(threadId, 'U_RULE_STRICT', 'hello from another tenant');
      expect(bridgeCalls).to.have.length(1);

      await setRule({ '==': [{ var: 'subscriber.data.banned' }, false] });
      await sendSlack(threadId, 'U_RULE_STRICT', 'hello without a banned field');
      expect(bridgeCalls).to.have.length(1);
      expect(replies).to.deep.equal([SUBSCRIBER_ACCESS_RULE_REFUSED_REPLY, SUBSCRIBER_ACCESS_RULE_REFUSED_REPLY]);
    });

    it('refuses an unknown Slack sender like restricted access does, without creating a subscriber', async () => {
      await setRule({ '!': { in: [ctx.agentIdentifier, { var: 'subscriber.data.blockedAgents' }] } });

      await sendSlack(`D_RULE_UNKNOWN_${Date.now()}`, 'U_RULE_STRANGER', 'who are you');

      expect(bridgeCalls).to.have.length(0);
      expect(replies).to.deep.equal([UNRESOLVED_SUBSCRIBER_ACCESS_REPLY]);
    });
  });
});
