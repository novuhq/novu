import {
  ConversationActivitySenderTypeEnum,
  ConversationParticipantTypeEnum,
  ConversationStatusEnum,
  SubscriberRepository,
} from '@novu/dal';
import { testServer } from '@novu/testing';
import { expect } from 'chai';
import type { EmojiValue } from 'chat';
import sinon from 'sinon';
import { AgentEventEnum } from '../dtos/agent-event.enum';
import { AgentConfigResolver } from '../services/agent-config-resolver.service';
import { AgentInboundHandler, InboundReactionEvent } from '../services/agent-inbound-handler.service';
import { BridgeExecutorParams, BridgeExecutorService } from '../services/bridge-executor.service';
import {
  AgentTestContext,
  activityRepository,
  conversationRepository,
  seedChannelEndpoint,
  setupAgentTestContext,
} from './helpers/agent-test-setup';
import { buildSlackAppMention, buildSlackChallenge, signSlackRequest } from './helpers/providers/slack';

function mockEmoji(name: string): EmojiValue {
  return { name, toJSON: () => `{{emoji:${name}}}`, toString: () => `{{emoji:${name}}}` };
}

function mockSentMessage() {
  return {
    addReaction: async () => {},
    removeReaction: async () => {},
    edit: async () => mockSentMessage(),
    delete: async () => {},
  };
}

function mockThread(id: string, channelId = 'C_TEST') {
  return {
    id,
    channelId,
    isDM: false,
    startTyping: async () => {},
    subscribe: async () => {},
    toJSON: () => ({ id, platform: 'slack', channelId, serialized: true }),
    createSentMessageFromMessage: () => mockSentMessage(),
  };
}

function mockMessage(opts: { id?: string; userId: string; text: string; fullName?: string }) {
  return {
    id: opts.id ?? `msg-${Date.now()}`,
    text: opts.text,
    author: {
      userId: opts.userId,
      fullName: opts.fullName ?? 'Test User',
      userName: 'testuser',
      isBot: false,
    },
    metadata: { dateSent: new Date() },
  };
}

describe('Agent Webhook - inbound flow #novu-v2', () => {
  let ctx: AgentTestContext;
  let inboundHandler: AgentInboundHandler;
  let configResolver: AgentConfigResolver;
  let bridgeCalls: BridgeExecutorParams[];

  before(() => {
    process.env.IS_CONVERSATIONAL_AGENTS_ENABLED = 'true';
  });

  beforeEach(async () => {
    ctx = await setupAgentTestContext();
    inboundHandler = testServer.getService(AgentInboundHandler);
    configResolver = testServer.getService(AgentConfigResolver);

    bridgeCalls = [];
    const bridgeExecutor = testServer.getService(BridgeExecutorService);
    sinon.stub(bridgeExecutor, 'execute').callsFake(async (params: BridgeExecutorParams) => {
      bridgeCalls.push(params);
    });
  });

  async function invokeInbound(
    threadId: string,
    message: ReturnType<typeof mockMessage>,
    event = AgentEventEnum.ON_MESSAGE
  ) {
    const config = await configResolver.resolve(ctx.agentId, ctx.integrationIdentifier);
    const thread = mockThread(threadId);
    await inboundHandler.handle(ctx.agentId, config, thread as any, message as any, event);
  }

  describe('Slack challenge verification', () => {
    it('should respond to Slack url_verification challenge', async () => {
      const challenge = buildSlackChallenge('my-challenge-value');
      const body = JSON.stringify(challenge);
      const timestamp = Math.floor(Date.now() / 1000);
      const headers = signSlackRequest(ctx.signingSecret, timestamp, body);

      const res = await ctx.session.testAgent
        .post(`/v1/agents/${ctx.agentId}/webhook/${ctx.integrationIdentifier}`)
        .set(headers)
        .set('content-type', 'application/json')
        .send(body);

      expect(res.status).to.equal(200);
      expect(res.text).to.contain('my-challenge-value');
    });
  });

  describe('Conversation creation', () => {
    it('should create a conversation on first inbound message with platform_user participant', async () => {
      const threadId = `T_CREATE_${Date.now()}`;
      const msg = mockMessage({ userId: 'U_CREATOR', text: 'Hello agent' });

      await invokeInbound(threadId, msg);

      const conversation = await conversationRepository.findByPlatformThread(
        ctx.session.environment._id,
        ctx.session.organization._id,
        threadId
      );

      expect(conversation).to.exist;
      expect(conversation!.status).to.equal(ConversationStatusEnum.ACTIVE);
      expect(conversation!.channels[0].platformThreadId).to.equal(threadId);
      expect(conversation!.channels[0].serializedThread).to.exist;
      expect(conversation!.messageCount).to.be.gte(1);

      const platformUserParticipant = conversation!.participants.find(
        (p) => p.type === ConversationParticipantTypeEnum.PLATFORM_USER
      );
      expect(platformUserParticipant).to.exist;
      expect(platformUserParticipant!.id).to.equal('slack:U_CREATOR');

      const agentParticipant = conversation!.participants.find((p) => p.type === ConversationParticipantTypeEnum.AGENT);
      expect(agentParticipant).to.exist;

      const activities = await activityRepository.findByConversation(ctx.session.environment._id, conversation!._id);
      expect(activities.length).to.be.gte(1);

      const userActivity = activities.find((a) => a.senderType === ConversationActivitySenderTypeEnum.PLATFORM_USER);
      expect(userActivity).to.exist;
      expect(userActivity!.content).to.equal('Hello agent');
    });

    it('should create participant as subscriber when channel endpoint exists', async () => {
      const subscriberRepository = new SubscriberRepository();
      const subscriber = await subscriberRepository.create({
        subscriberId: `sub-e2e-${Date.now()}`,
        firstName: 'E2E',
        lastName: 'Subscriber',
        _environmentId: ctx.session.environment._id,
        _organizationId: ctx.session.organization._id,
      });

      await seedChannelEndpoint(ctx, 'U_LINKED', subscriber.subscriberId);

      const threadId = `T_SUB_${Date.now()}`;
      const msg = mockMessage({ userId: 'U_LINKED', text: 'Hi from subscriber' });

      await invokeInbound(threadId, msg);

      const conversation = await conversationRepository.findByPlatformThread(
        ctx.session.environment._id,
        ctx.session.organization._id,
        threadId
      );

      expect(conversation).to.exist;

      const subParticipant = conversation!.participants.find(
        (p) => p.type === ConversationParticipantTypeEnum.SUBSCRIBER
      );
      expect(subParticipant).to.exist;
      expect(subParticipant!.id).to.equal(subscriber.subscriberId);

      const activities = await activityRepository.findByConversation(ctx.session.environment._id, conversation!._id);
      const userActivity = activities.find((a) => a.content === 'Hi from subscriber');
      expect(userActivity!.senderType).to.equal(ConversationActivitySenderTypeEnum.SUBSCRIBER);
    });
  });

  describe('Thread handling', () => {
    it('should reuse existing conversation for messages in the same thread', async () => {
      const threadId = `T_REUSE_${Date.now()}`;

      await invokeInbound(threadId, mockMessage({ userId: 'U1', text: 'First message' }));
      await invokeInbound(threadId, mockMessage({ userId: 'U1', text: 'Second message' }), AgentEventEnum.ON_MESSAGE);

      const conversation = await conversationRepository.findByPlatformThread(
        ctx.session.environment._id,
        ctx.session.organization._id,
        threadId
      );

      expect(conversation).to.exist;
      expect(conversation!.messageCount).to.be.gte(2);

      const activities = await activityRepository.findByConversation(ctx.session.environment._id, conversation!._id);
      expect(activities.length).to.be.gte(2);
    });
  });

  describe('Bridge call verification', () => {
    it('should fire bridge call with correct payload shape and subscriber data', async () => {
      const subscriberRepository = new SubscriberRepository();
      const subscriber = await subscriberRepository.create({
        subscriberId: `sub-bridge-${Date.now()}`,
        firstName: 'Bridge',
        lastName: 'Test',
        email: 'bridge@test.com',
        _environmentId: ctx.session.environment._id,
        _organizationId: ctx.session.organization._id,
      });

      await seedChannelEndpoint(ctx, 'U_BRIDGE', subscriber.subscriberId);

      const threadId = `T_BRIDGE_${Date.now()}`;
      await invokeInbound(threadId, mockMessage({ userId: 'U_BRIDGE', text: 'Bridge test' }));

      expect(bridgeCalls.length).to.equal(1);
      const call = bridgeCalls[0];

      expect(call.event).to.equal(AgentEventEnum.ON_MESSAGE);
      expect(call.config.agentIdentifier).to.equal(ctx.agentIdentifier);
      expect(call.config.integrationIdentifier).to.equal(ctx.integrationIdentifier);
      expect(call.config.platform).to.equal('slack');
      expect(call.conversation).to.exist;
      expect(call.conversation._id).to.be.a('string');

      expect(call.subscriber).to.exist;
      expect(call.subscriber!.subscriberId).to.equal(subscriber.subscriberId);
      expect(call.subscriber!.firstName).to.equal('Bridge');
      expect(call.subscriber!.email).to.equal('bridge@test.com');

      expect(call.history).to.be.an('array');
      expect(call.message).to.exist;
      expect(call.message!.text).to.equal('Bridge test');

      expect(call.platformContext.threadId).to.equal(threadId);
      expect(call.platformContext.channelId).to.equal('C_TEST');
      expect(call.platformContext.isDM).to.equal(false);
    });

    it('should send null subscriber in bridge payload when unresolved', async () => {
      const threadId = `T_NOSUB_${Date.now()}`;
      await invokeInbound(threadId, mockMessage({ userId: 'U_UNKNOWN', text: 'No subscriber' }));

      expect(bridgeCalls.length).to.equal(1);
      expect(bridgeCalls[0].subscriber).to.be.null;
    });
  });

  describe('Security', () => {
    it('should reject requests with invalid Slack signature', async () => {
      const body = JSON.stringify({ type: 'event_callback', event: { type: 'app_mention' } });
      const timestamp = Math.floor(Date.now() / 1000);
      const headers = signSlackRequest('wrong-secret', timestamp, body);

      const res = await ctx.session.testAgent
        .post(`/v1/agents/${ctx.agentId}/webhook/${ctx.integrationIdentifier}`)
        .set(headers)
        .set('content-type', 'application/json')
        .send(body);

      expect(res.status).to.not.equal(200);
    });
  });

  describe('Inactive agent', () => {
    it('should return 200 and not process inbound when agent is inactive', async () => {
      await ctx.session.testAgent.patch(`/v1/agents/${ctx.agentIdentifier}`).send({ active: false });

      const body = JSON.stringify(
        buildSlackAppMention({ userId: 'U_INACTIVE', channel: 'C_TEST', threadTs: `T_INACTIVE_${Date.now()}` })
      );
      const timestamp = Math.floor(Date.now() / 1000);
      const headers = signSlackRequest(ctx.signingSecret, timestamp, body);

      const res = await ctx.session.testAgent
        .post(`/v1/agents/${ctx.agentId}/webhook/${ctx.integrationIdentifier}`)
        .set(headers)
        .set('content-type', 'application/json')
        .send(body);

      expect(res.status).to.equal(200);
      expect(bridgeCalls.length).to.equal(0);
    });

    it('should process inbound again after reactivation', async () => {
      await ctx.session.testAgent.patch(`/v1/agents/${ctx.agentIdentifier}`).send({ active: false });
      await ctx.session.testAgent.patch(`/v1/agents/${ctx.agentIdentifier}`).send({ active: true });

      const body = JSON.stringify(
        buildSlackAppMention({ userId: 'U_REACTIVATED', channel: 'C_TEST', threadTs: `T_REACTIVATE_${Date.now()}` })
      );
      const timestamp = Math.floor(Date.now() / 1000);
      const headers = signSlackRequest(ctx.signingSecret, timestamp, body);

      const res = await ctx.session.testAgent
        .post(`/v1/agents/${ctx.agentId}/webhook/${ctx.integrationIdentifier}`)
        .set(headers)
        .set('content-type', 'application/json')
        .send(body);

      expect(res.status).to.equal(200);
      expect(bridgeCalls.length).to.equal(1);
    });
  });

  describe('Conversation lifecycle', () => {
    it('should reopen resolved conversation on new inbound message', async () => {
      const threadId = `T_REOPEN_${Date.now()}`;

      await invokeInbound(threadId, mockMessage({ userId: 'U_REOPEN', text: 'Initial' }));

      const conversation = await conversationRepository.findByPlatformThread(
        ctx.session.environment._id,
        ctx.session.organization._id,
        threadId
      );
      expect(conversation!.status).to.equal(ConversationStatusEnum.ACTIVE);

      await conversationRepository.updateStatus(
        ctx.session.environment._id,
        ctx.session.organization._id,
        conversation!._id,
        ConversationStatusEnum.RESOLVED
      );

      await invokeInbound(threadId, mockMessage({ userId: 'U_REOPEN', text: 'Reopening' }), AgentEventEnum.ON_MESSAGE);

      const reopened = await conversationRepository.findByPlatformThread(
        ctx.session.environment._id,
        ctx.session.organization._id,
        threadId
      );
      expect(reopened!.status).to.equal(ConversationStatusEnum.ACTIVE);
      expect(reopened!._id).to.equal(conversation!._id);
    });

    it('should upgrade platform_user to subscriber when endpoint is later created', async () => {
      const subscriberRepository = new SubscriberRepository();
      const threadId = `T_UPGRADE_${Date.now()}`;

      await invokeInbound(threadId, mockMessage({ userId: 'U_LATER', text: 'Before endpoint' }));

      let conversation = await conversationRepository.findByPlatformThread(
        ctx.session.environment._id,
        ctx.session.organization._id,
        threadId
      );
      const platformUserParticipant = conversation!.participants.find(
        (p) => p.type === ConversationParticipantTypeEnum.PLATFORM_USER
      );
      expect(platformUserParticipant).to.exist;

      const subscriber = await subscriberRepository.create({
        subscriberId: `sub-upgrade-${Date.now()}`,
        firstName: 'Upgraded',
        _environmentId: ctx.session.environment._id,
        _organizationId: ctx.session.organization._id,
      });
      await seedChannelEndpoint(ctx, 'U_LATER', subscriber.subscriberId);

      await invokeInbound(
        threadId,
        mockMessage({ userId: 'U_LATER', text: 'After endpoint' }),
        AgentEventEnum.ON_MESSAGE
      );

      conversation = await conversationRepository.findByPlatformThread(
        ctx.session.environment._id,
        ctx.session.organization._id,
        threadId
      );

      const subParticipant = conversation!.participants.find(
        (p) => p.type === ConversationParticipantTypeEnum.SUBSCRIBER
      );
      expect(subParticipant).to.exist;
      expect(subParticipant!.id).to.equal(subscriber.subscriberId);

      const remainingPlatformUsers = conversation!.participants.filter(
        (p) => p.type === ConversationParticipantTypeEnum.PLATFORM_USER && p.id === 'slack:U_LATER'
      );
      expect(remainingPlatformUsers.length).to.equal(0);
    });
  });

  describe('Reaction handling', () => {
    async function invokeReaction(threadId: string, reaction: InboundReactionEvent) {
      const config = await configResolver.resolve(ctx.agentId, ctx.integrationIdentifier);
      await inboundHandler.handleReaction(ctx.agentId, config, reaction);
    }

    it('should fire ON_REACTION bridge call for an existing conversation', async () => {
      const threadId = `T_REACT_${Date.now()}`;
      const msg = mockMessage({ userId: 'U_REACT', text: 'React to this' });

      await invokeInbound(threadId, msg);
      bridgeCalls = [];

      const reactionEvent: InboundReactionEvent = {
        emoji: mockEmoji('thumbs_up'),
        added: true,
        messageId: msg.id,
        message: msg as any,
        thread: mockThread(threadId) as any,
      };

      await invokeReaction(threadId, reactionEvent);

      expect(bridgeCalls.length).to.equal(1);
      const call = bridgeCalls[0];
      expect(call.event).to.equal(AgentEventEnum.ON_REACTION);
      expect(call.reaction).to.exist;
      expect(call.reaction!.emoji).to.equal('thumbs_up');
      expect(call.reaction!.added).to.equal(true);
      expect(call.reaction!.messageId).to.equal(msg.id);
    });

    it('should skip reaction when no conversation exists for the thread', async () => {
      const reactionEvent: InboundReactionEvent = {
        emoji: mockEmoji('wave'),
        added: true,
        messageId: 'msg-orphan',
        thread: mockThread(`T_NOCONV_${Date.now()}`) as any,
      };

      await invokeReaction('ignored', reactionEvent);

      expect(bridgeCalls.length).to.equal(0);
    });

    it('should skip reaction when thread context is missing', async () => {
      const reactionEvent: InboundReactionEvent = {
        emoji: mockEmoji('fire'),
        added: false,
        messageId: 'msg-no-thread',
      };

      await invokeReaction('ignored', reactionEvent);

      expect(bridgeCalls.length).to.equal(0);
    });

    it('should include sourceMessage in reaction bridge call', async () => {
      const threadId = `T_REACT_MSG_${Date.now()}`;
      const msg = mockMessage({ userId: 'U_REACT_MSG', text: 'Source message test', fullName: 'Jane Doe' });

      await invokeInbound(threadId, msg);
      bridgeCalls = [];

      const reactionEvent: InboundReactionEvent = {
        emoji: mockEmoji('tada'),
        added: true,
        messageId: msg.id,
        message: msg as any,
        thread: mockThread(threadId) as any,
      };

      await invokeReaction(threadId, reactionEvent);

      expect(bridgeCalls.length).to.equal(1);
      const call = bridgeCalls[0];
      expect(call.reaction!.sourceMessage).to.exist;
      expect(call.reaction!.sourceMessage!.text).to.equal('Source message test');
      expect(call.reaction!.sourceMessage!.author.fullName).to.equal('Jane Doe');
    });

    it('should not persist conversation activity for reactions', async () => {
      const threadId = `T_REACT_NOACT_${Date.now()}`;
      const msg = mockMessage({ userId: 'U_REACT2', text: 'Activity test' });

      await invokeInbound(threadId, msg);

      const conversation = await conversationRepository.findByPlatformThread(
        ctx.session.environment._id,
        ctx.session.organization._id,
        threadId
      );
      const activitiesBefore = await activityRepository.findByConversation(
        ctx.session.environment._id,
        conversation!._id
      );

      const reactionEvent: InboundReactionEvent = {
        emoji: mockEmoji('heart'),
        added: true,
        messageId: msg.id,
        message: msg as any,
        thread: mockThread(threadId) as any,
      };

      await invokeReaction(threadId, reactionEvent);

      const activitiesAfter = await activityRepository.findByConversation(
        ctx.session.environment._id,
        conversation!._id
      );
      expect(activitiesAfter.length).to.equal(activitiesBefore.length);
    });
  });
});
