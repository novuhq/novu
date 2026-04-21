import {
  AgentRepository,
  ConversationActivityRepository,
  ConversationActivitySenderTypeEnum,
  ConversationActivityTypeEnum,
  ConversationParticipantTypeEnum,
  ConversationRepository,
  ConversationStatusEnum,
} from '@novu/dal';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';

/** Valid ObjectId shape required by conversation / activity schemas for `_integrationId`. */
const SEED_INTEGRATION_OBJECT_ID = '507f1f77bcf86cd799439011';

describe('Conversations API - /conversations #novu-v2', () => {
  let session: UserSession;
  const conversationRepository = new ConversationRepository();
  const activityRepository = new ConversationActivityRepository();
  const agentRepository = new AgentRepository();

  let agentId: string;

  before(() => {
    process.env.IS_CONVERSATIONAL_AGENTS_ENABLED = 'true';
  });

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();

    const agent = await agentRepository.create({
      name: 'E2E Conversations Agent',
      identifier: `conv-agent-${Date.now()}`,
      active: true,
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
    });
    agentId = agent._id;
  });

  async function seedConversation(
    overrides: Partial<{
      status: ConversationStatusEnum;
      title: string;
      metadata: Record<string, unknown>;
      identifier: string;
      subscriberId: string;
    }> = {}
  ) {
    const identifier = overrides.identifier ?? `conv-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const participants: Array<{ type: ConversationParticipantTypeEnum; id: string }> = [
      { type: ConversationParticipantTypeEnum.AGENT, id: agentId },
    ];

    if (overrides.subscriberId) {
      participants.push({ type: ConversationParticipantTypeEnum.SUBSCRIBER, id: overrides.subscriberId });
    }

    return conversationRepository.create({
      identifier,
      _agentId: agentId,
      participants,
      channels: [
        {
          platform: 'slack',
          _integrationId: SEED_INTEGRATION_OBJECT_ID,
          platformThreadId: `thread-${Date.now()}`,
        },
      ],
      status: overrides.status ?? ConversationStatusEnum.ACTIVE,
      title: overrides.title ?? 'Test conversation',
      metadata: overrides.metadata ?? {},
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      lastActivityAt: new Date().toISOString(),
    });
  }

  async function seedActivity(
    conversationId: string,
    overrides: Partial<{
      content: string;
      senderType: ConversationActivitySenderTypeEnum;
      type: ConversationActivityTypeEnum;
    }> = {}
  ) {
    return activityRepository.create({
      identifier: `act-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      _conversationId: conversationId,
      type: overrides.type ?? ConversationActivityTypeEnum.MESSAGE,
      content: overrides.content ?? 'Test message',
      platform: 'slack',
      _integrationId: SEED_INTEGRATION_OBJECT_ID,
      platformThreadId: `thread-${Date.now()}`,
      senderType: overrides.senderType ?? ConversationActivitySenderTypeEnum.SUBSCRIBER,
      senderId: 'user-1',
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
    });
  }

  describe('GET /v1/conversations', () => {
    it('should return an empty paginated list when no conversations exist', async () => {
      const res = await session.testAgent.get('/v1/conversations');

      expect(res.status).to.equal(200);
      expect(res.body.data).to.be.an('array').with.length(0);
      expect(res.body).to.have.property('next', null);
      expect(res.body).to.have.property('previous', null);
      expect(res.body).to.have.property('totalCount', 0);
      expect(res.body).to.have.property('totalCountCapped');
    });

    it('should list seeded conversations', async () => {
      await seedConversation({ title: 'First' });
      await seedConversation({ title: 'Second' });

      const res = await session.testAgent.get('/v1/conversations');

      expect(res.status).to.equal(200);
      expect(res.body.data).to.be.an('array');
      expect(res.body.data.length).to.be.at.least(2);
    });

    it('should filter by status', async () => {
      await seedConversation({ status: ConversationStatusEnum.ACTIVE, title: 'Active conv' });
      await seedConversation({ status: ConversationStatusEnum.RESOLVED, title: 'Resolved conv' });

      const activeRes = await session.testAgent.get('/v1/conversations').query({ status: 'active' });

      expect(activeRes.status).to.equal(200);
      expect(activeRes.body.data.every((c: { status: string }) => c.status === 'active')).to.be.true;

      const resolvedRes = await session.testAgent.get('/v1/conversations').query({ status: 'resolved' });

      expect(resolvedRes.status).to.equal(200);
      expect(resolvedRes.body.data.every((c: { status: string }) => c.status === 'resolved')).to.be.true;
    });

    it('should filter by subscriberId', async () => {
      await seedConversation({ subscriberId: session.subscriberId, title: 'With subscriber' });
      await seedConversation({ title: 'Without subscriber' });

      const res = await session.testAgent.get('/v1/conversations').query({ subscriberId: session.subscriberId });

      expect(res.status).to.equal(200);
      expect(res.body.data.length).to.equal(1);
      expect(res.body.data[0].title).to.equal('With subscriber');
    });

    it('should paginate with limit and after cursor', async () => {
      for (let i = 0; i < 5; i++) {
        await seedConversation({ title: `Conv ${i}` });
      }

      const firstPage = await session.testAgent.get('/v1/conversations').query({ limit: 2, orderDirection: 'asc' });

      expect(firstPage.status).to.equal(200);
      expect(firstPage.body.data).to.have.length(2);
      expect(firstPage.body.next).to.be.a('string');

      const secondPage = await session.testAgent
        .get('/v1/conversations')
        .query({ limit: 2, after: firstPage.body.next, orderDirection: 'asc' });

      expect(secondPage.status).to.equal(200);
      expect(secondPage.body.data).to.have.length(2);
      expect(secondPage.body.data[0]._id).to.not.equal(firstPage.body.data[0]._id);
    });

    it('should return 400 when both before and after cursors are provided', async () => {
      const res = await session.testAgent
        .get('/v1/conversations')
        .query({ before: '000000000000000000000001', after: '000000000000000000000002' });

      expect(res.status).to.equal(400);
    });

    it('should not return conversations from another environment', async () => {
      await seedConversation({ title: 'Visible' });

      const otherSession = new UserSession();
      await otherSession.initialize();

      const res = await otherSession.testAgent.get('/v1/conversations');

      expect(res.status).to.equal(200);
      expect(res.body.data).to.have.length(0);
    });
  });

  describe('GET /v1/conversations/:conversationId', () => {
    it('should return a conversation by identifier', async () => {
      const conversation = await seedConversation({ title: 'Get me' });

      const res = await session.testAgent.get(`/v1/conversations/${conversation.identifier}`);

      expect(res.status).to.equal(200);
      expect(res.body.data.identifier).to.equal(conversation.identifier);
      expect(res.body.data.title).to.equal('Get me');
      expect(res.body.data.status).to.equal(ConversationStatusEnum.ACTIVE);
      expect(res.body.data._agentId).to.equal(agentId);
      expect(res.body.data.participants).to.be.an('array');
      expect(res.body.data.channels).to.be.an('array');
    });

    it('should return 404 for non-existent conversation', async () => {
      const res = await session.testAgent.get('/v1/conversations/nonexistent-identifier');

      expect(res.status).to.equal(404);
    });
  });

  describe('PATCH /v1/conversations/:conversationId', () => {
    it('should update conversation status', async () => {
      const conversation = await seedConversation();

      const res = await session.testAgent
        .patch(`/v1/conversations/${conversation.identifier}`)
        .send({ status: ConversationStatusEnum.RESOLVED });

      expect(res.status).to.equal(200);
      expect(res.body.data.status).to.equal(ConversationStatusEnum.RESOLVED);
    });

    it('should update conversation title', async () => {
      const conversation = await seedConversation({ title: 'Original' });

      const res = await session.testAgent
        .patch(`/v1/conversations/${conversation.identifier}`)
        .send({ title: 'Updated title' });

      expect(res.status).to.equal(200);
      expect(res.body.data.title).to.equal('Updated title');
    });

    it('should update conversation metadata', async () => {
      const conversation = await seedConversation();

      const res = await session.testAgent
        .patch(`/v1/conversations/${conversation.identifier}`)
        .send({ metadata: { priority: 'high', ticketId: 'T-123' } });

      expect(res.status).to.equal(200);
      expect(res.body.data.metadata).to.deep.equal({ priority: 'high', ticketId: 'T-123' });
    });

    it('should return unchanged conversation when no fields are sent', async () => {
      const conversation = await seedConversation({ title: 'Unchanged' });

      const res = await session.testAgent.patch(`/v1/conversations/${conversation.identifier}`).send({});

      expect(res.status).to.equal(200);
      expect(res.body.data.title).to.equal('Unchanged');
    });

    it('should return 404 for non-existent conversation', async () => {
      const res = await session.testAgent.patch('/v1/conversations/nonexistent-identifier').send({ title: 'Nope' });

      expect(res.status).to.equal(404);
    });
  });

  describe('DELETE /v1/conversations/:conversationId', () => {
    it('should delete a conversation and return 204', async () => {
      const conversation = await seedConversation();
      await seedActivity(conversation._id);

      const deleteRes = await session.testAgent.delete(`/v1/conversations/${conversation.identifier}`);

      expect(deleteRes.status).to.equal(204);

      const getRes = await session.testAgent.get(`/v1/conversations/${conversation.identifier}`);

      expect(getRes.status).to.equal(404);
    });

    it('should also delete associated activities', async () => {
      const conversation = await seedConversation();
      await seedActivity(conversation._id, { content: 'Activity 1' });
      await seedActivity(conversation._id, { content: 'Activity 2' });

      await session.testAgent.delete(`/v1/conversations/${conversation.identifier}`);

      const remaining = await activityRepository.find(
        {
          _conversationId: conversation._id,
          _environmentId: session.environment._id,
          _organizationId: session.organization._id,
        },
        '*'
      );

      expect(remaining).to.have.length(0);
    });

    it('should return 404 for non-existent conversation', async () => {
      const res = await session.testAgent.delete('/v1/conversations/nonexistent-identifier');

      expect(res.status).to.equal(404);
    });
  });

  describe('GET /v1/conversations/:conversationId/activities', () => {
    it('should return activities for a conversation', async () => {
      const conversation = await seedConversation();
      await seedActivity(conversation._id, {
        content: 'Hello from user',
        senderType: ConversationActivitySenderTypeEnum.SUBSCRIBER,
      });
      await seedActivity(conversation._id, {
        content: 'Hello from agent',
        senderType: ConversationActivitySenderTypeEnum.AGENT,
      });

      const res = await session.testAgent.get(`/v1/conversations/${conversation.identifier}/activities`);

      expect(res.status).to.equal(200);
      expect(res.body.data).to.be.an('array').with.length(2);
      expect(res.body.data[0].content).to.equal('Hello from user');
      expect(res.body.data[1].content).to.equal('Hello from agent');
      expect(res.body).to.have.property('next');
      expect(res.body).to.have.property('previous');
      expect(res.body).to.have.property('totalCount', 2);
    });

    it('should return empty list when conversation has no activities', async () => {
      const conversation = await seedConversation();

      const res = await session.testAgent.get(`/v1/conversations/${conversation.identifier}/activities`);

      expect(res.status).to.equal(200);
      expect(res.body.data).to.have.length(0);
      expect(res.body.totalCount).to.equal(0);
    });

    it('should paginate activities', async () => {
      const conversation = await seedConversation();
      for (let i = 0; i < 5; i++) {
        await seedActivity(conversation._id, { content: `Message ${i}` });
      }

      const firstPage = await session.testAgent
        .get(`/v1/conversations/${conversation.identifier}/activities`)
        .query({ limit: 2, orderDirection: 'asc' });

      expect(firstPage.status).to.equal(200);
      expect(firstPage.body.data).to.have.length(2);
      expect(firstPage.body.next).to.be.a('string');

      const secondPage = await session.testAgent
        .get(`/v1/conversations/${conversation.identifier}/activities`)
        .query({ limit: 2, after: firstPage.body.next, orderDirection: 'asc' });

      expect(secondPage.status).to.equal(200);
      expect(secondPage.body.data).to.have.length(2);
      expect(secondPage.body.data[0]._id).to.not.equal(firstPage.body.data[0]._id);
    });

    it('should return 404 for activities of non-existent conversation', async () => {
      const res = await session.testAgent.get('/v1/conversations/nonexistent-identifier/activities');

      expect(res.status).to.equal(404);
    });

    it('should return 400 when both before and after cursors are provided', async () => {
      const conversation = await seedConversation();

      const res = await session.testAgent
        .get(`/v1/conversations/${conversation.identifier}/activities`)
        .query({ before: '000000000000000000000001', after: '000000000000000000000002' });

      expect(res.status).to.equal(400);
    });
  });
});
