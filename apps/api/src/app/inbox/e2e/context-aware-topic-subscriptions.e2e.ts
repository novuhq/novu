import { buildDefaultSubscriptionIdentifier } from '@novu/application-generic';
import { IntegrationRepository, PreferencesRepository, TopicSubscribersRepository } from '@novu/dal';
import { ChannelTypeEnum, ContextPayload, InAppProviderIdEnum, StepTypeEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { CreateTopicSubscriptionRequestDto } from '../dtos/create-topic-subscription-request.dto';
import { UpdatePreferencesRequestDto } from '../dtos/update-preferences-request.dto';

const integrationRepository = new IntegrationRepository();
const preferencesRepository = new PreferencesRepository();
const topicSubscribersRepository = new TopicSubscribersRepository();

const CONTEXT_A: ContextPayload = { tenant: 'tenant-a', project: 'project-a' };
const CONTEXT_B: ContextPayload = { tenant: 'tenant-b', project: 'project-b' };

describe('Context-aware topic subscriptions - /inbox/topics (with context) #novu-v2', () => {
  let session: UserSession;
  let contextAToken: string;
  let contextBToken: string;
  let noContextToken: string;

  beforeEach(async () => {
    (process.env as Record<string, string>).IS_CONTEXT_PREFERENCES_ENABLED = 'true';

    session = new UserSession();
    await session.initialize();

    // Wrap testAgent to include Novu-Client-Version header for context-aware behavior
    const agent = session.testAgent;
    session.testAgent = {
      get: (url: string) => agent.get(url).set('Novu-Client-Version', '@novu/js@3.13.0'),
      post: (url: string) => agent.post(url).set('Novu-Client-Version', '@novu/js@3.13.0'),
      patch: (url: string) => agent.patch(url).set('Novu-Client-Version', '@novu/js@3.13.0'),
      delete: (url: string) => agent.delete(url).set('Novu-Client-Version', '@novu/js@3.13.0'),
    } as any;

    await setIntegrationConfig(session.environment._id, session.environment._organizationId);

    const sessionAResponse = await initializeSessionWithContext(session, CONTEXT_A);
    expect(sessionAResponse.status).to.equal(201);
    contextAToken = sessionAResponse.body.data.token;

    const sessionBResponse = await initializeSessionWithContext(session, CONTEXT_B);
    expect(sessionBResponse.status).to.equal(201);
    contextBToken = sessionBResponse.body.data.token;

    const sessionNoContextResponse = await initializeSessionWithContext(session);
    expect(sessionNoContextResponse.status).to.equal(201);
    noContextToken = sessionNoContextResponse.body.data.token;
  });

  describe('POST /inbox/topics/:topicKey/subscriptions', () => {
    it('should create separate subscriptions for same topic in different contexts', async () => {
      const topicKey = generateUniqueId('topic');
      const identifierA = `${generateUniqueId('sub')}-a`;
      const identifierB = `${generateUniqueId('sub')}-b`;

      const createA = await createSubscription(session, topicKey, { identifier: identifierA }, contextAToken);
      expect(createA.status).to.equal(201);
      expect(createA.body.data.identifier).to.equal(identifierA);

      const createB = await createSubscription(session, topicKey, { identifier: identifierB }, contextBToken);
      expect(createB.status).to.equal(201);
      expect(createB.body.data.identifier).to.equal(identifierB);

      const subscriptionA = await topicSubscribersRepository.findOne({
        _environmentId: session.environment._id,
        identifier: identifierA,
      });
      const subscriptionB = await topicSubscribersRepository.findOne({
        _environmentId: session.environment._id,
        identifier: identifierB,
      });

      expect(subscriptionA).to.exist;
      expect(subscriptionB).to.exist;
      expect(subscriptionA?.contextKeys).to.have.members(['tenant:tenant-a', 'project:project-a']);
      expect(subscriptionB?.contextKeys).to.have.members(['tenant:tenant-b', 'project:project-b']);
    });

    it('should create subscriptions with different identifiers in different contexts when no identifier provided', async () => {
      const topicKey = generateUniqueId('topic');

      const createA = await createSubscription(session, topicKey, {}, contextAToken);
      expect(createA.status).to.equal(201);
      const identifierA = createA.body.data.identifier;

      const createB = await createSubscription(session, topicKey, {}, contextBToken);
      expect(createB.status).to.equal(201);
      const identifierB = createB.body.data.identifier;

      expect(identifierA).to.not.equal(identifierB);
      expect(identifierA).to.include(`tk_${topicKey}`);
      expect(identifierB).to.include(`tk_${topicKey}`);
      expect(identifierA).to.include('ctx_');
      expect(identifierB).to.include('ctx_');

      const subscriptionA = await topicSubscribersRepository.findOne({
        _environmentId: session.environment._id,
        identifier: identifierA,
      });
      const subscriptionB = await topicSubscribersRepository.findOne({
        _environmentId: session.environment._id,
        identifier: identifierB,
      });

      expect(subscriptionA).to.exist;
      expect(subscriptionB).to.exist;
      expect(subscriptionA?.contextKeys).to.have.members(['tenant:tenant-a', 'project:project-a']);
      expect(subscriptionB?.contextKeys).to.have.members(['tenant:tenant-b', 'project:project-b']);
    });

    it('should create subscription with empty contextKeys when no context provided', async () => {
      const topicKey = generateUniqueId('topic');
      const identifier = generateUniqueId('sub');

      const createResponse = await createSubscription(session, topicKey, { identifier }, noContextToken);
      expect(createResponse.status).to.equal(201);

      const subscription = await topicSubscribersRepository.findOne({
        _environmentId: session.environment._id,
        identifier,
      });

      expect(subscription?.contextKeys).to.deep.equal([]);
    });

    it('should fail when creating subscription with duplicate identifier', async () => {
      const topicKey = `topic-key`;
      const identifier = `same-identifier`;

      const createFirst = await createSubscription(
        session,
        topicKey,
        { identifier, name: 'First Name' },
        contextAToken
      );
      expect(createFirst.status).to.equal(201);
      expect(createFirst.body.data.name).to.equal('First Name');

      const createSecond = await createSubscription(
        session,
        topicKey,
        { identifier, name: 'Second Name' },
        contextBToken
      );
      expect(createSecond.status).to.equal(400);
      expect(createSecond.body.message).to.include('duplicate');

      const subscriptions = await topicSubscribersRepository.find({
        _environmentId: session.environment._id,
        identifier,
      });

      expect(subscriptions).to.have.lengthOf(1);
      expect(subscriptions[0].name).to.equal('First Name');
      expect(subscriptions[0].contextKeys).to.have.members(['tenant:tenant-a', 'project:project-a']);
    });

    it('should generate identifiers with sorted context keys', async () => {
      const topicKey = generateUniqueId('topic');

      const createA = await createSubscription(session, topicKey, {}, contextAToken);
      expect(createA.status).to.equal(201);
      const identifierA = createA.body.data.identifier;

      const createB = await createSubscription(session, topicKey, {}, contextBToken);
      expect(createB.status).to.equal(201);
      const identifierB = createB.body.data.identifier;

      expect(identifierA).to.not.equal(identifierB);

      const expectedIdentifierA = buildDefaultSubscriptionIdentifier(topicKey, session.subscriberId, [
        'project:project-a',
        'tenant:tenant-a',
      ]);
      const expectedIdentifierB = buildDefaultSubscriptionIdentifier(topicKey, session.subscriberId, [
        'project:project-b',
        'tenant:tenant-b',
      ]);

      expect(identifierA).to.equal(expectedIdentifierA);
      expect(identifierB).to.equal(expectedIdentifierB);
    });

    it('should not inherit preferences when creating subscription in new context', async () => {
      const topicKey = generateUniqueId('topic');
      const identifierA = `${generateUniqueId('sub')}-a`;
      const identifierB = `${generateUniqueId('sub')}-b`;

      const workflow = await session.createTemplate({ noFeedId: true });

      await createSubscription(session, topicKey, { identifier: identifierA }, contextAToken);
      await updateSubscriptionPreferences(session, identifierA, workflow._id, { enabled: false }, contextAToken);

      await createSubscription(session, topicKey, { identifier: identifierB }, contextBToken);
      const getB = await getSubscription(session, topicKey, identifierB, contextBToken);

      const prefB = getB.body.data.preferences?.find(
        (p: { workflow: { id: string } }) => p.workflow.id === workflow._id
      );
      expect(prefB?.enabled).to.not.equal(false);
    });
  });

  describe('GET /inbox/topics/:topicKey/subscriptions/:identifier', () => {
    it('should return subscription only for matching context', async () => {
      const topicKey = generateUniqueId('topic');
      const identifier = generateUniqueId('sub');

      await createSubscription(session, topicKey, { identifier }, contextAToken);

      const getA = await getSubscription(session, topicKey, identifier, contextAToken);
      expect(getA.status).to.equal(200);
      expect(getA.body.data.identifier).to.equal(identifier);

      const getB = await getSubscription(session, topicKey, identifier, contextBToken);
      expect(getB.status).to.equal(204);
    });

    it('should return subscription without context when no context in session', async () => {
      const topicKey = generateUniqueId('topic');
      const identifier = generateUniqueId('sub');

      await createSubscription(session, topicKey, { identifier }, noContextToken);

      const getNoContext = await getSubscription(session, topicKey, identifier, noContextToken);
      expect(getNoContext.status).to.equal(200);
      expect(getNoContext.body.data.identifier).to.equal(identifier);
    });

    it('should not return subscription with context when session has no context', async () => {
      const topicKey = generateUniqueId('topic');
      const identifier = generateUniqueId('sub');

      await createSubscription(session, topicKey, { identifier }, contextAToken);

      const getNoContext = await getSubscription(session, topicKey, identifier, noContextToken);
      expect(getNoContext.status).to.equal(204);
    });
  });

  describe('GET /inbox/topics/:topicKey/subscriptions', () => {
    it('should return only subscriptions for matching context', async () => {
      const topicKey = generateUniqueId('topic');
      const identifierA = `${generateUniqueId('sub')}-a`;
      const identifierB = `${generateUniqueId('sub')}-b`;

      await createSubscription(session, topicKey, { identifier: identifierA }, contextAToken);
      await createSubscription(session, topicKey, { identifier: identifierB }, contextBToken);

      const listA = await getTopicSubscriptions(session, topicKey, contextAToken);
      expect(listA.status).to.equal(200);
      expect(listA.body.data).to.have.lengthOf(1);
      expect(listA.body.data[0].identifier).to.equal(identifierA);

      const listB = await getTopicSubscriptions(session, topicKey, contextBToken);
      expect(listB.status).to.equal(200);
      expect(listB.body.data).to.have.lengthOf(1);
      expect(listB.body.data[0].identifier).to.equal(identifierB);
    });
  });

  describe('PATCH /inbox/topics/:topicKey/subscriptions/:identifier', () => {
    it('should update subscription scoped to context', async () => {
      const topicKey = generateUniqueId('topic');
      const identifierA = `${generateUniqueId('sub')}-a`;
      const identifierB = `${generateUniqueId('sub')}-b`;

      await createSubscription(session, topicKey, { identifier: identifierA }, contextAToken);
      await createSubscription(session, topicKey, { identifier: identifierB }, contextBToken);

      const updateA = await updateSubscription(session, topicKey, identifierA, { name: 'Updated A' }, contextAToken);
      expect(updateA.status).to.equal(200);
      expect(updateA.body.data.name).to.equal('Updated A');

      const getA = await getSubscription(session, topicKey, identifierA, contextAToken);
      expect(getA.body.data.name).to.equal('Updated A');

      const getB = await getSubscription(session, topicKey, identifierB, contextBToken);
      expect(getB.body.data.name).to.not.equal('Updated A');
    });
  });

  describe('DELETE /inbox/topics/:topicKey/subscriptions/:identifier', () => {
    it('should delete subscription scoped to context', async () => {
      const topicKey = generateUniqueId('topic');
      const identifierA = `${generateUniqueId('sub')}-a`;
      const identifierB = `${generateUniqueId('sub')}-b`;

      await createSubscription(session, topicKey, { identifier: identifierA }, contextAToken);
      await createSubscription(session, topicKey, { identifier: identifierB }, contextBToken);

      const deleteA = await deleteSubscription(session, topicKey, identifierA, contextAToken);
      expect(deleteA.status).to.equal(200);

      const getA = await getSubscription(session, topicKey, identifierA, contextAToken);
      expect(getA.status).to.equal(204);

      const getB = await getSubscription(session, topicKey, identifierB, contextBToken);
      expect(getB.status).to.equal(200);
    });
  });

  describe('PATCH /inbox/subscriptions/:subscriptionIdentifier/preferences/:workflowId', () => {
    it('should update preferences scoped to context', async () => {
      const topicKey = generateUniqueId('topic');
      const identifierA = `${generateUniqueId('sub')}-a`;
      const identifierB = `${generateUniqueId('sub')}-b`;
      const workflow = await session.createTemplate({
        noFeedId: true,
        steps: [{ type: StepTypeEnum.IN_APP, content: 'Test' }],
      });

      await createSubscription(session, topicKey, { identifier: identifierA }, contextAToken);
      await createSubscription(session, topicKey, { identifier: identifierB }, contextBToken);

      const updateA = await updateSubscriptionPreferences(
        session,
        identifierA,
        workflow._id,
        { enabled: false },
        contextAToken
      );
      expect(updateA.status).to.equal(200);
      expect(updateA.body.data.enabled).to.equal(false);

      const updateB = await updateSubscriptionPreferences(
        session,
        identifierB,
        workflow._id,
        { enabled: true },
        contextBToken
      );
      expect(updateB.status).to.equal(200);
      expect(updateB.body.data.enabled).to.equal(true);

      const getA = await getSubscription(session, topicKey, identifierA, contextAToken);
      const prefA = getA.body.data.preferences?.find(
        (p: { workflow: { id: string } }) => p.workflow.id === workflow._id
      );
      expect(prefA?.enabled).to.equal(false);

      const getB = await getSubscription(session, topicKey, identifierB, contextBToken);
      const prefB = getB.body.data.preferences?.find(
        (p: { workflow: { id: string } }) => p.workflow.id === workflow._id
      );
      expect(prefB?.enabled).to.equal(true);
    });

    it('should create SUBSCRIPTION_SUBSCRIBER_WORKFLOW preferences with context', async () => {
      const topicKey = generateUniqueId('topic');
      const identifierA = `${generateUniqueId('sub')}-a`;
      const identifierB = `${generateUniqueId('sub')}-b`;
      const workflow = await session.createTemplate({
        noFeedId: true,
        steps: [{ type: StepTypeEnum.IN_APP, content: 'Test' }],
      });

      const createResponseA = await createSubscription(session, topicKey, { identifier: identifierA }, contextAToken);
      const subscriptionIdA = createResponseA.body.data.id;
      await createSubscription(session, topicKey, { identifier: identifierB }, contextBToken);

      await updateSubscriptionPreferences(session, identifierA, workflow._id, { enabled: false }, contextAToken);

      const preferences = await preferencesRepository.find({
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
        _topicSubscriptionId: subscriptionIdA,
        type: 'SUBSCRIPTION_SUBSCRIBER_WORKFLOW',
      });

      expect(preferences).to.have.lengthOf(1);
      expect(preferences[0].contextKeys).to.deep.equal(['project:project-a', 'tenant:tenant-a']);
    });
  });
});

function generateUniqueId(prefix: string): string {
  return `${prefix}-${Date.now()}`;
}

async function initializeSessionWithContext(session: UserSession, context?: ContextPayload) {
  return await session.testAgent.post('/v1/inbox/session').send({
    applicationIdentifier: session.environment.identifier,
    subscriberId: session.subscriberId,
    context,
  });
}

async function setIntegrationConfig(environmentId: string, organizationId: string) {
  await integrationRepository.update(
    {
      _environmentId: environmentId,
      _organizationId: organizationId,
      providerId: InAppProviderIdEnum.Novu,
      channel: ChannelTypeEnum.IN_APP,
      active: true,
    },
    {
      $set: {
        'credentials.hmac': false,
        active: true,
      },
    }
  );
}

async function createSubscription(
  session: UserSession,
  topicKey: string,
  body: CreateTopicSubscriptionRequestDto,
  token?: string
) {
  return await session.testAgent
    .post(`/v1/inbox/topics/${topicKey}/subscriptions`)
    .send(body)
    .set('Authorization', `Bearer ${token || session.subscriberToken}`);
}

async function getSubscription(session: UserSession, topicKey: string, identifier: string, token?: string) {
  return await session.testAgent
    .get(`/v1/inbox/topics/${topicKey}/subscriptions/${identifier}`)
    .set('Authorization', `Bearer ${token || session.subscriberToken}`);
}

async function getTopicSubscriptions(session: UserSession, topicKey: string, token?: string) {
  return await session.testAgent
    .get(`/v1/inbox/topics/${topicKey}/subscriptions`)
    .set('Authorization', `Bearer ${token || session.subscriberToken}`);
}

async function updateSubscription(
  session: UserSession,
  topicKey: string,
  identifier: string,
  body: { name?: string },
  token?: string
) {
  return await session.testAgent
    .patch(`/v1/inbox/topics/${topicKey}/subscriptions/${identifier}`)
    .send(body)
    .set('Authorization', `Bearer ${token || session.subscriberToken}`);
}

async function deleteSubscription(session: UserSession, topicKey: string, identifier: string, token?: string) {
  return await session.testAgent
    .delete(`/v1/inbox/topics/${topicKey}/subscriptions/${identifier}`)
    .set('Authorization', `Bearer ${token || session.subscriberToken}`);
}

async function updateSubscriptionPreferences(
  session: UserSession,
  subscriptionIdentifier: string,
  workflowId: string,
  body: UpdatePreferencesRequestDto,
  token?: string
) {
  return await session.testAgent
    .patch(`/v1/inbox/subscriptions/${subscriptionIdentifier}/preferences/${workflowId}`)
    .send(body)
    .set('Authorization', `Bearer ${token || session.subscriberToken}`);
}
