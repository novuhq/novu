import {
  ConversationActivitySenderTypeEnum,
  ConversationActivityTypeEnum,
  ConversationStatusEnum,
} from '@novu/dal';
import { testServer } from '@novu/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import { BridgeExecutorService, BridgeExecutorParams } from '../services/bridge-executor.service';
import { ChatSdkService } from '../services/chat-sdk.service';
import {
  setupAgentTestContext,
  seedConversation,
  conversationRepository,
  activityRepository,
  AgentTestContext,
} from './helpers/agent-test-setup';

describe('Agent Reply - /agents/:agentId/reply #novu-v2', () => {
  let ctx: AgentTestContext;
  let bridgeCalls: BridgeExecutorParams[];

  before(() => {
    process.env.IS_CONVERSATIONAL_AGENTS_ENABLED = 'true';
  });

  beforeEach(async () => {
    ctx = await setupAgentTestContext();

    bridgeCalls = [];
    const bridgeExecutor = testServer.getService(BridgeExecutorService);
    sinon.stub(bridgeExecutor, 'execute').callsFake(async (params: BridgeExecutorParams) => {
      bridgeCalls.push(params);
    });

    const chatSdkService = testServer.getService(ChatSdkService);
    sinon
      .stub(chatSdkService, 'postToConversation')
      .resolves({ messageId: 'platform-msg-1', platformThreadId: 'platform-thread-1' });
    sinon
      .stub(chatSdkService, 'editInConversation')
      .resolves({ messageId: 'platform-msg-1', platformThreadId: 'platform-thread-1' });
    sinon.stub(chatSdkService, 'reactToMessage').resolves();
    sinon.stub(chatSdkService, 'removeReaction').resolves();
  });

  function postReply(body: Record<string, unknown>) {
    return ctx.session.testAgent
      .post(`/v1/agents/${ctx.agentIdentifier}/reply`)
      .send(body);
  }

  describe('Delivery and persistence', () => {
    it('should persist agent reply activity and increment messageCount', async () => {
      const conversationId = await seedConversation(ctx);
      const convBefore = await conversationRepository.findOne(
        { _id: conversationId, _environmentId: ctx.session.environment._id },
        '*'
      );
      const countBefore = convBefore!.messageCount;

      const res = await postReply({
        conversationId,
        integrationIdentifier: ctx.integrationIdentifier,
        reply: { text: 'Hello from agent' },
      });

      expect(res.status).to.equal(200);
      expect(res.body.data?.messageId).to.equal('platform-msg-1');

      const convAfter = await conversationRepository.findOne(
        { _id: conversationId, _environmentId: ctx.session.environment._id },
        '*'
      );
      expect(convAfter!.messageCount).to.equal(countBefore + 1);
      expect(convAfter!.lastMessagePreview).to.equal('Hello from agent');

      const activities = await activityRepository.findByConversation(
        ctx.session.environment._id,
        conversationId
      );
      const agentActivity = activities.find(
        (a) => a.senderType === ConversationActivitySenderTypeEnum.AGENT && a.type === ConversationActivityTypeEnum.MESSAGE
      );
      expect(agentActivity).to.exist;
      expect(agentActivity!.content).to.equal('Hello from agent');
    });

    it('should return messageId/platformThreadId on successful reply', async () => {
      const conversationId = await seedConversation(ctx);

      const res = await postReply({
        conversationId,
        integrationIdentifier: ctx.integrationIdentifier,
        reply: { text: 'Hello' },
      });

      expect(res.status).to.equal(200);
      expect(res.body.data.messageId).to.equal('platform-msg-1');
      expect(res.body.data.platformThreadId).to.equal('platform-thread-1');
    });

    it('should edit a previously sent message and persist an edit activity', async () => {
      const conversationId = await seedConversation(ctx);

      const convBefore = await conversationRepository.findOne(
        { _id: conversationId, _environmentId: ctx.session.environment._id },
        '*'
      );
      const countBefore = convBefore!.messageCount;

      const res = await postReply({
        conversationId,
        integrationIdentifier: ctx.integrationIdentifier,
        edit: {
          messageId: 'platform-msg-1',
          content: { text: 'Edited content' },
        },
      });

      expect(res.status).to.equal(200);
      expect(res.body.data.messageId).to.equal('platform-msg-1');
      expect(res.body.data.platformThreadId).to.equal('platform-thread-1');

      const activities = await activityRepository.findByConversation(
        ctx.session.environment._id,
        conversationId
      );
      const editActivity = activities.find((a) => a.type === ConversationActivityTypeEnum.EDIT);
      expect(editActivity).to.exist;
      expect(editActivity!.content).to.equal('Edited content');
      expect(editActivity!.platformMessageId).to.equal('platform-msg-1');

      const conversation = await conversationRepository.findOne(
        { _id: conversationId, _environmentId: ctx.session.environment._id },
        '*'
      );
      expect(conversation!.status).to.equal(ConversationStatusEnum.ACTIVE);
      // Edit refreshes the conversation's lastMessagePreview to the new content...
      expect(conversation!.lastMessagePreview).to.equal('Edited content');
      // ...without bumping messageCount (edits mutate an existing message, not add one).
      expect(conversation!.messageCount).to.equal(countBefore);
    });

    it('should reject when both reply and edit are provided', async () => {
      const conversationId = await seedConversation(ctx);

      const res = await postReply({
        conversationId,
        integrationIdentifier: ctx.integrationIdentifier,
        reply: { text: 'a' },
        edit: { messageId: 'platform-msg-1', content: { text: 'b' } },
      });

      expect(res.status).to.equal(400);
    });

    it('should reject when edit is combined with signals', async () => {
      const conversationId = await seedConversation(ctx);

      const res = await postReply({
        conversationId,
        integrationIdentifier: ctx.integrationIdentifier,
        edit: { messageId: 'platform-msg-1', content: { text: 'b' } },
        signals: [{ type: 'metadata', key: 'k', value: 'v' }],
      });

      expect(res.status).to.equal(400);
    });

    it('should return 400 when conversation has no serialized thread', async () => {
      const conversationId = await seedConversation(ctx, { withSerializedThread: false });

      const res = await postReply({
        conversationId,
        integrationIdentifier: ctx.integrationIdentifier,
        reply: { text: 'Should fail' },
      });

      expect(res.status).to.equal(400);
    });
  });

  describe('Signals (metadata)', () => {
    it('should merge metadata signals into conversation.metadata and persist signal activity', async () => {
      const conversationId = await seedConversation(ctx);

      const res = await postReply({
        conversationId,
        integrationIdentifier: ctx.integrationIdentifier,
        signals: [{ type: 'metadata', key: 'sentiment', value: 'positive' }],
      });

      expect(res.status).to.equal(200);
      expect(res.body.data).to.be.null;

      const conversation = await conversationRepository.findOne(
        { _id: conversationId, _environmentId: ctx.session.environment._id },
        '*'
      );
      expect(conversation!.metadata).to.have.property('sentiment', 'positive');

      const activities = await activityRepository.findByConversation(
        ctx.session.environment._id,
        conversationId
      );
      const signalActivity = activities.find(
        (a) =>
          a.type === ConversationActivityTypeEnum.SIGNAL &&
          a.senderType === ConversationActivitySenderTypeEnum.SYSTEM
      );
      expect(signalActivity).to.exist;
      expect(signalActivity!.signalData).to.exist;
      expect(signalActivity!.signalData!.type).to.equal('metadata');
    });

    it('should reject when cumulative metadata exceeds 64KB', async () => {
      const bigValue = 'x'.repeat(60_000);
      const conversationId = await seedConversation(ctx, {
        metadata: { existingBigKey: bigValue },
      });

      const res = await postReply({
        conversationId,
        integrationIdentifier: ctx.integrationIdentifier,
        signals: [{ type: 'metadata', key: 'overflow', value: 'x'.repeat(6_000) }],
      });

      expect(res.status).to.equal(400);
    });
  });

  describe('Resolve', () => {
    it('should resolve conversation and fire onResolve bridge callback', async () => {
      const conversationId = await seedConversation(ctx);

      const res = await postReply({
        conversationId,
        integrationIdentifier: ctx.integrationIdentifier,
        resolve: { summary: 'Issue fixed' },
      });

      expect(res.status).to.equal(200);
      expect(res.body.data).to.be.null;

      const conversation = await conversationRepository.findOne(
        { _id: conversationId, _environmentId: ctx.session.environment._id },
        '*'
      );
      expect(conversation!.status).to.equal(ConversationStatusEnum.RESOLVED);

      const activities = await activityRepository.findByConversation(
        ctx.session.environment._id,
        conversationId
      );
      const resolveActivity = activities.find(
        (a) => a.type === ConversationActivityTypeEnum.SIGNAL && a.signalData?.type === 'resolve'
      );
      expect(resolveActivity).to.exist;
      expect(resolveActivity!.content).to.contain('Issue fixed');

      // onResolve bridge call is fire-and-forget; give it a moment
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(bridgeCalls.length).to.be.gte(1);
      const resolveCall = bridgeCalls.find((c) => c.event === 'onResolve');
      expect(resolveCall).to.exist;
    });

    it('should handle reply + signals + resolve in a single request', async () => {
      const conversationId = await seedConversation(ctx);
      const convBefore = await conversationRepository.findOne(
        { _id: conversationId, _environmentId: ctx.session.environment._id },
        '*'
      );

      const res = await postReply({
        conversationId,
        integrationIdentifier: ctx.integrationIdentifier,
        reply: { text: 'Here is your answer' },
        signals: [{ type: 'metadata', key: 'resolved_by', value: 'bot' }],
        resolve: { summary: 'Answered' },
      });

      expect(res.status).to.equal(200);
      expect(res.body.data.messageId).to.equal('platform-msg-1');
      expect(res.body.data.platformThreadId).to.equal('platform-thread-1');

      const convAfter = await conversationRepository.findOne(
        { _id: conversationId, _environmentId: ctx.session.environment._id },
        '*'
      );
      expect(convAfter!.messageCount).to.equal(convBefore!.messageCount + 1);
      expect(convAfter!.metadata).to.have.property('resolved_by', 'bot');
      expect(convAfter!.status).to.equal(ConversationStatusEnum.RESOLVED);

      const activities = await activityRepository.findByConversation(
        ctx.session.environment._id,
        conversationId
      );

      const messageActivity = activities.find(
        (a) => a.type === ConversationActivityTypeEnum.MESSAGE && a.senderType === ConversationActivitySenderTypeEnum.AGENT
      );
      expect(messageActivity).to.exist;
      expect(messageActivity!.content).to.equal('Here is your answer');

      const metadataActivity = activities.find(
        (a) => a.type === ConversationActivityTypeEnum.SIGNAL && a.signalData?.type === 'metadata'
      );
      expect(metadataActivity).to.exist;

      const resolveActivity = activities.find(
        (a) => a.type === ConversationActivityTypeEnum.SIGNAL && a.signalData?.type === 'resolve'
      );
      expect(resolveActivity).to.exist;
    });
  });
});
