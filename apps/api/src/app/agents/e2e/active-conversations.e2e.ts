import { AgentEntitlementsService } from '@novu/application-generic';
import { CommunityOrganizationRepository, ConversationActivationRepository, ConversationStatusEnum } from '@novu/dal';
import { ApiServiceLevelEnum } from '@novu/shared';
import { testServer } from '@novu/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import { AgentConfigResolver } from '../channels/agent-config-resolver.service';
import { ConversationActivationService } from '../conversation-runtime/conversation/conversation-activation.service';
import { OutboundGateway } from '../conversation-runtime/egress/outbound.gateway';
import { ChatInstanceRegistry } from '../conversation-runtime/ingress/chat-instance.registry';
import { AgentInboundHandler } from '../conversation-runtime/ingress/inbound-turn.handler';
import { AgentExecutionParams, BridgeExecutorService } from '../conversation-runtime/runtime/bridge-executor.service';
import { RuntimeResolver } from '../conversation-runtime/runtime/runtime-resolver.service';
import { AgentEventEnum } from '../shared/enums/agent-event.enum';
import { AgentPlatformEnum } from '../shared/enums/agent-platform.enum';
import { AgentTestContext, conversationRepository, setupAgentTestContext } from './helpers/agent-test-setup';

function mockSentMessage() {
  return {
    addReaction: async () => {},
    removeReaction: async () => {},
    edit: async () => mockSentMessage(),
    delete: async () => {},
  };
}

function mockThread(id: string, opts: { channelId?: string; isDM?: boolean } = {}) {
  const channelId = opts.channelId ?? 'C_TEST';

  return {
    id,
    channelId,
    isDM: opts.isDM ?? false,
    startTyping: async () => {},
    subscribe: async () => {},
    post: async () => mockSentMessage(),
    toJSON: () => ({ id, channelId }),
    createSentMessageFromMessage: () => mockSentMessage(),
  };
}

function mockMessage(opts: { id?: string; userId: string; text: string }) {
  return {
    id: opts.id ?? `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text: opts.text,
    author: { userId: opts.userId, fullName: 'Test User', userName: 'testuser', isBot: false },
    metadata: { dateSent: new Date() },
  };
}

async function clearChatSdkInstances(): Promise<void> {
  const registry = testServer.getService(ChatInstanceRegistry);
  await registry.onModuleDestroy();
}

describe('Active Conversations metering - inbound flow #novu-v2', () => {
  const organizationRepository = new CommunityOrganizationRepository();
  const activationRepository = new ConversationActivationRepository();

  let ctx: AgentTestContext;
  let inboundHandler: AgentInboundHandler;
  let configResolver: AgentConfigResolver;
  let activationService: ConversationActivationService;
  let bridgeCalls: AgentExecutionParams[];

  beforeEach(async () => {
    ctx = await setupAgentTestContext();
    inboundHandler = testServer.getService(AgentInboundHandler);
    configResolver = testServer.getService(AgentConfigResolver);
    activationService = testServer.getService(ConversationActivationService);

    bridgeCalls = [];
    const bridgeExecutor = testServer.getService(BridgeExecutorService);
    sinon.stub(bridgeExecutor, 'execute').callsFake(async (params: AgentExecutionParams) => {
      bridgeCalls.push(params);
    });
  });

  afterEach(async () => {
    await clearChatSdkInstances();
    sinon.restore();
  });

  // Count is period-agnostic (every test uses a fresh org), so it works whether
  // the resolved period is calendar month or a Stripe billing cycle.
  async function countActivations(): Promise<number> {
    return activationRepository.count({ _organizationId: ctx.session.organization._id });
  }

  async function setServiceLevel(apiServiceLevel: ApiServiceLevelEnum, isTrial = false): Promise<void> {
    await organizationRepository.update({ _id: ctx.session.organization._id }, { $set: { apiServiceLevel, isTrial } });
  }

  async function invokeSlack(threadId: string, text: string, opts: { isDM?: boolean; userId?: string } = {}) {
    const config = await configResolver.resolve(ctx.agentId, ctx.integrationIdentifier);
    const thread = mockThread(threadId, { isDM: opts.isDM, channelId: opts.isDM ? 'D_TEST' : 'C_TEST' });
    const message = mockMessage({ userId: opts.userId ?? 'U_ACTIVE', text });
    await inboundHandler.handle(ctx.agentId, config, thread as any, message as any, AgentEventEnum.ON_MESSAGE);
  }

  async function invokeWhatsApp(phone: string, text: string) {
    const baseConfig = await configResolver.resolve(ctx.agentId, ctx.integrationIdentifier);
    const config = { ...baseConfig, platform: AgentPlatformEnum.WHATSAPP };
    const threadId = `whatsapp:${phone}`;
    const thread = mockThread(threadId, { channelId: threadId, isDM: true });
    const message = mockMessage({ userId: phone, text });
    await inboundHandler.handle(ctx.agentId, config, thread as any, message as any, AgentEventEnum.ON_MESSAGE);

    return threadId;
  }

  async function findConversation(threadId: string) {
    return conversationRepository.findByPlatformThread(
      ctx.session.environment._id,
      ctx.session.organization._id,
      ctx.agentId,
      ctx.integrationId,
      threadId
    );
  }

  describe('Counting model', () => {
    it('counts a single conversation once across many messages', async () => {
      const threadId = `T_MANY_${Date.now()}`;

      await invokeSlack(threadId, 'one');
      await invokeSlack(threadId, 'two');
      await invokeSlack(threadId, 'three');

      expect(await countActivations()).to.equal(1);
    });

    it('counts a separate conversation per distinct thread', async () => {
      await invokeSlack(`T_A_${Date.now()}`, 'hi A');
      await invokeSlack(`T_B_${Date.now()}`, 'hi B');

      expect(await countActivations()).to.equal(2);
    });

    it('counts a reopen after resolve as a new active conversation (same cycle)', async () => {
      const threadId = `T_REOPEN_${Date.now()}`;

      await invokeSlack(threadId, 'initial');
      expect(await countActivations()).to.equal(1);

      const conversation = await findConversation(threadId);
      // Mimic resolveConversation's billing + status effects.
      await conversationRepository.updateStatus(
        ctx.session.environment._id,
        ctx.session.organization._id,
        conversation!._id,
        ConversationStatusEnum.RESOLVED
      );
      await conversationRepository.markBillingResolved(
        ctx.session.environment._id,
        ctx.session.organization._id,
        conversation!._id,
        new Date().toISOString()
      );

      await invokeSlack(threadId, 'reopening');

      const reopened = await findConversation(threadId);
      expect(reopened!.status).to.equal(ConversationStatusEnum.ACTIVE);
      expect(reopened!._id).to.equal(conversation!._id);
      expect(await countActivations()).to.equal(2);
    });

    it('counts again after the rolling inactivity window lapses (WhatsApp 24h)', async () => {
      const threadId = await invokeWhatsApp('15551230000', 'day one');
      expect(await countActivations()).to.equal(1);

      const conversation = await findConversation(threadId);
      // Rewind the last engagement past the 24h WhatsApp window.
      const stale = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
      await conversationRepository.update(
        {
          _id: conversation!._id,
          _environmentId: ctx.session.environment._id,
          _organizationId: ctx.session.organization._id,
        },
        { $set: { 'billing.lastEngagementAt': stale } }
      );

      await invokeWhatsApp('15551230000', 'next day');

      expect(await countActivations()).to.equal(2);
    });

    it('does not recount within the rolling window', async () => {
      const threadId = await invokeWhatsApp('15551231111', 'first');
      const conversation = await findConversation(threadId);
      // Only 2h elapsed — inside the 24h WhatsApp window.
      const recent = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      await conversationRepository.update(
        {
          _id: conversation!._id,
          _environmentId: ctx.session.environment._id,
          _organizationId: ctx.session.organization._id,
        },
        { $set: { 'billing.lastEngagementAt': recent } }
      );

      await invokeWhatsApp('15551231111', 'a bit later');

      expect(await countActivations()).to.equal(1);
    });

    it('counts again in a new billing period for a continuing conversation', async () => {
      const threadId = `T_CYCLE_${Date.now()}`;

      await invokeSlack(threadId, 'this month');
      expect(await countActivations()).to.equal(1);

      const conversation = await findConversation(threadId);
      // Pretend it was last counted in a previous period.
      await conversationRepository.update(
        {
          _id: conversation!._id,
          _environmentId: ctx.session.environment._id,
          _organizationId: ctx.session.organization._id,
        },
        { $set: { 'billing.lastCountedPeriodKey': '2000-01' } }
      );

      await invokeSlack(threadId, 'new cycle');

      expect(await countActivations()).to.equal(2);
    });

    it('does not count when dispatch fails (no agent engagement)', async () => {
      const runtimeResolver = testServer.getService(RuntimeResolver);
      sinon.stub(runtimeResolver, 'resolve').returns({
        dispatch: async () => {
          throw new Error('dispatch failed');
        },
      } as any);

      const threadId = `T_FAIL_${Date.now()}`;
      let threw = false;
      try {
        await invokeSlack(threadId, 'will fail');
      } catch {
        threw = true;
      }

      expect(threw).to.equal(true);
      expect(await countActivations()).to.equal(0);
    });
  });

  describe('Free-tier short-circuit', () => {
    beforeEach(() => {
      sinon.stub(testServer.getService(AgentEntitlementsService), 'getActiveConversationsLimit').resolves(1);
    });

    it('blocks a new conversation once the included limit is reached, but keeps existing ones working', async () => {
      await setServiceLevel(ApiServiceLevelEnum.FREE);

      const cardSpy = sinon
        .stub(testServer.getService(OutboundGateway), 'replyOnThreadWithCard')
        .resolves(undefined as any);

      const threadA = `T_FREE_A_${Date.now()}`;
      await invokeSlack(threadA, 'first conversation');
      expect(await countActivations()).to.equal(1);
      expect(bridgeCalls.length).to.equal(1);

      // New conversation would start a second activation — blocked at the limit.
      const threadB = `T_FREE_B_${Date.now()}`;
      await invokeSlack(threadB, 'second conversation');
      expect(await countActivations(), 'blocked conversation must not be counted').to.equal(1);
      expect(bridgeCalls.length, 'blocked conversation must not dispatch').to.equal(1);
      expect(cardSpy.called, 'an upgrade card should be posted').to.equal(true);
      // Gate runs before persistence — a blocked brand-new thread leaves no orphan.
      expect(await findConversation(threadB), 'blocked new conversation must not be persisted').to.equal(null);

      // The already-counted conversation keeps working.
      await invokeSlack(threadA, 'follow up');
      expect(bridgeCalls.length, 'existing conversation should still dispatch').to.equal(2);
      expect(await countActivations()).to.equal(1);
    });

    it('does not block paid tiers even when over the limit', async () => {
      await setServiceLevel(ApiServiceLevelEnum.PRO);

      await invokeSlack(`T_PRO_A_${Date.now()}`, 'a');
      await invokeSlack(`T_PRO_B_${Date.now()}`, 'b');

      expect(bridgeCalls.length).to.equal(2);
      expect(await countActivations()).to.equal(2);
    });

    it('does not block trial organizations', async () => {
      await setServiceLevel(ApiServiceLevelEnum.FREE, true);

      await invokeSlack(`T_TRIAL_A_${Date.now()}`, 'a');
      await invokeSlack(`T_TRIAL_B_${Date.now()}`, 'b');

      expect(bridgeCalls.length).to.equal(2);
      expect(await countActivations()).to.equal(2);
    });
  });

  describe('Usage endpoint', () => {
    it('returns the current count and included limit for the period', async () => {
      await setServiceLevel(ApiServiceLevelEnum.PRO);

      await invokeSlack(`T_USAGE_${Date.now()}`, 'count me');

      const res = await ctx.session.testAgent.get('/v1/agents/usage/conversations');

      expect(res.status).to.equal(200);
      expect(res.body.data.current).to.equal(1);
      expect(res.body.data.included).to.equal(1000);
      expect(res.body.data.periodStart).to.be.a('string');
      expect(res.body.data.periodEnd).to.be.a('string');
    });
  });

  describe('Stripe billing period', () => {
    const DAY = 24 * 60 * 60 * 1000;

    it('anchors counting and usage to the Stripe billing period for a billed org', async () => {
      await setServiceLevel(ApiServiceLevelEnum.PRO);
      // A billed org has a Stripe customer, which enables the Stripe-period path.
      await organizationRepository.update(
        { _id: ctx.session.organization._id },
        { $set: { stripeCustomerId: 'cus_dummy_e2e' } }
      );

      const periodStart = new Date(Date.now() - 10 * DAY);
      const periodEnd = new Date(Date.now() + 20 * DAY);
      const periodKey = `stripe:${periodStart.toISOString()}`;
      // Dummy Stripe period (no live Stripe call in tests).
      sinon.stub(activationService as any, 'fetchStripeBillingPeriod').resolves({ periodKey, periodStart, periodEnd });

      await invokeSlack(`T_STRIPE_${Date.now()}`, 'billed');

      // Activation was recorded against the Stripe period key, not the calendar month.
      expect(await activationRepository.countForOrganizationPeriod(ctx.session.organization._id, periodKey)).to.equal(
        1
      );

      const res = await ctx.session.testAgent.get('/v1/agents/usage/conversations');
      expect(res.status).to.equal(200);
      expect(res.body.data.current).to.equal(1);
      expect(res.body.data.periodStart).to.equal(periodStart.toISOString());
      expect(res.body.data.periodEnd).to.equal(periodEnd.toISOString());
    });
  });
});
