import { ChannelConnectionRepository, ChannelEndpointRepository, IntegrationRepository } from '@novu/dal';
import { ChannelTypeEnum, ChatProviderIdEnum, ContextPayload, ENDPOINT_TYPES, InAppProviderIdEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';

const channelConnectionRepository = new ChannelConnectionRepository();
const channelEndpointRepository = new ChannelEndpointRepository();
const integrationRepository = new IntegrationRepository();

const CONTEXT_A: ContextPayload = { tenant: 'tenant-a', project: 'project-a' };
const CONTEXT_B: ContextPayload = { tenant: 'tenant-b', project: 'project-b' };

describe('Context-aware inbox channel resources - /inbox/channel-* #novu-v2', () => {
  let session: UserSession;
  let contextAToken: string;
  let contextBToken: string;
  let noContextToken: string;
  let slackIntegrationIdentifier: string;
  let previousContextPrefFlag: string | undefined;

  beforeEach(async () => {
    previousContextPrefFlag = process.env.IS_CONTEXT_PREFERENCES_ENABLED;
    (process.env as Record<string, string>).IS_CONTEXT_PREFERENCES_ENABLED = 'true';

    session = new UserSession();
    await session.initialize();

    const agent = session.testAgent;
    session.testAgent = {
      get: (url: string) => agent.get(url).set('Novu-Client-Version', '@novu/js@3.13.0'),
      post: (url: string) => agent.post(url).set('Novu-Client-Version', '@novu/js@3.13.0'),
      patch: (url: string) => agent.patch(url).set('Novu-Client-Version', '@novu/js@3.13.0'),
      delete: (url: string) => agent.delete(url).set('Novu-Client-Version', '@novu/js@3.13.0'),
    } as any;

    await ensureInAppIntegrationActive(session.environment._id, session.environment._organizationId);
    slackIntegrationIdentifier = await createSlackIntegration(session);

    const sessionA = await initializeSessionWithContext(session, CONTEXT_A);
    expect(sessionA.status).to.equal(201);
    contextAToken = sessionA.body.data.token;

    const sessionB = await initializeSessionWithContext(session, CONTEXT_B);
    expect(sessionB.status).to.equal(201);
    contextBToken = sessionB.body.data.token;

    const sessionNoContext = await initializeSessionWithContext(session);
    expect(sessionNoContext.status).to.equal(201);
    noContextToken = sessionNoContext.body.data.token;
  });

  afterEach(() => {
    const env = process.env as Record<string, string | undefined>;
    if (previousContextPrefFlag === undefined) {
      delete env.IS_CONTEXT_PREFERENCES_ENABLED;
    } else {
      env.IS_CONTEXT_PREFERENCES_ENABLED = previousContextPrefFlag;
    }
  });

  describe('Channel connections', () => {
    it('should not leak channel connections from another context when listing', async () => {
      const connectionA = await createConnection(session, slackIntegrationIdentifier, [
        'project:project-a',
        'tenant:tenant-a',
      ]);
      const connectionB = await createConnection(session, slackIntegrationIdentifier, [
        'project:project-b',
        'tenant:tenant-b',
      ]);

      const listA = await listChannelConnections(session, contextAToken);
      expect(listA.status).to.equal(200);
      expect(listA.body.data).to.have.lengthOf(1);
      expect(listA.body.data[0].identifier).to.equal(connectionA.identifier);

      const listB = await listChannelConnections(session, contextBToken);
      expect(listB.status).to.equal(200);
      expect(listB.body.data).to.have.lengthOf(1);
      expect(listB.body.data[0].identifier).to.equal(connectionB.identifier);
    });

    it('should ignore caller-supplied contextKeys query param and use JWT context for list', async () => {
      const connectionA = await createConnection(session, slackIntegrationIdentifier, [
        'project:project-a',
        'tenant:tenant-a',
      ]);
      await createConnection(session, slackIntegrationIdentifier, ['project:project-b', 'tenant:tenant-b']);

      const listAttempt = await session.testAgent
        .get('/v1/inbox/channel-connections?contextKeys=project:project-b&contextKeys=tenant:tenant-b')
        .set('Authorization', `Bearer ${contextAToken}`);

      expect(listAttempt.status).to.equal(200);
      expect(listAttempt.body.data).to.have.lengthOf(1);
      expect(listAttempt.body.data[0].identifier).to.equal(connectionA.identifier);
    });

    it('should return 404 when retrieving a channel connection that belongs to another context', async () => {
      const connectionB = await createConnection(session, slackIntegrationIdentifier, [
        'project:project-b',
        'tenant:tenant-b',
      ]);

      const getA = await getChannelConnection(session, connectionB.identifier, contextAToken);
      expect(getA.status).to.equal(404);

      const getB = await getChannelConnection(session, connectionB.identifier, contextBToken);
      expect(getB.status).to.equal(200);
      expect(getB.body.data.identifier).to.equal(connectionB.identifier);
    });

    it('should not leak other-context channel connections when cursor pagination is used', async () => {
      const connectionDefault = await createConnection(session, slackIntegrationIdentifier, []);
      const connectionB1 = await createConnection(session, slackIntegrationIdentifier, [
        'project:project-b',
        'tenant:tenant-b',
      ]);
      const connectionB2 = await createConnection(session, slackIntegrationIdentifier, [
        'project:project-b',
        'tenant:tenant-b',
      ]);

      const listNoContext = await session.testAgent
        .get(`/v1/inbox/channel-connections?limit=10&after=${connectionB2._id}`)
        .set('Authorization', `Bearer ${noContextToken}`);

      expect(listNoContext.status).to.equal(200);
      const identifiers = (listNoContext.body.data as Array<{ identifier: string }>).map((d) => d.identifier);
      expect(identifiers).to.not.include(connectionB1.identifier);
      expect(identifiers).to.not.include(connectionB2.identifier);
      expect(identifiers).to.include(connectionDefault.identifier);
    });

    it('should not allow deleting a channel connection from another context', async () => {
      const connectionB = await createConnection(session, slackIntegrationIdentifier, [
        'project:project-b',
        'tenant:tenant-b',
      ]);

      const deleteAttempt = await deleteChannelConnection(session, connectionB.identifier, contextAToken);
      expect(deleteAttempt.status).to.equal(404);

      const stillThere = await channelConnectionRepository.findOne({
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
        identifier: connectionB.identifier,
      });
      expect(stillThere).to.exist;

      const ownDelete = await deleteChannelConnection(session, connectionB.identifier, contextBToken);
      expect(ownDelete.status).to.equal(204);

      const removed = await channelConnectionRepository.findOne({
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
        identifier: connectionB.identifier,
      });
      expect(removed).to.be.null;
    });
  });

  describe('Channel endpoints', () => {
    it('should not leak channel endpoints from another context when listing', async () => {
      const endpointA = await createEndpoint(session, slackIntegrationIdentifier, [
        'project:project-a',
        'tenant:tenant-a',
      ]);
      const endpointB = await createEndpoint(session, slackIntegrationIdentifier, [
        'project:project-b',
        'tenant:tenant-b',
      ]);

      const listA = await listChannelEndpoints(session, contextAToken);
      expect(listA.status).to.equal(200);
      expect(listA.body.data).to.have.lengthOf(1);
      expect(listA.body.data[0].identifier).to.equal(endpointA.identifier);

      const listB = await listChannelEndpoints(session, contextBToken);
      expect(listB.status).to.equal(200);
      expect(listB.body.data).to.have.lengthOf(1);
      expect(listB.body.data[0].identifier).to.equal(endpointB.identifier);
    });

    it('should not leak other-context channel endpoints when cursor pagination is used', async () => {
      const endpointDefault = await createEndpoint(session, slackIntegrationIdentifier, []);
      const endpointB1 = await createEndpoint(session, slackIntegrationIdentifier, [
        'project:project-b',
        'tenant:tenant-b',
      ]);
      const endpointB2 = await createEndpoint(session, slackIntegrationIdentifier, [
        'project:project-b',
        'tenant:tenant-b',
      ]);

      const listNoContext = await session.testAgent
        .get(`/v1/inbox/channel-endpoints?limit=10&after=${endpointB2._id}`)
        .set('Authorization', `Bearer ${noContextToken}`);

      expect(listNoContext.status).to.equal(200);
      const identifiers = (listNoContext.body.data as Array<{ identifier: string }>).map((d) => d.identifier);
      expect(identifiers).to.not.include(endpointB1.identifier);
      expect(identifiers).to.not.include(endpointB2.identifier);
      expect(identifiers).to.include(endpointDefault.identifier);
    });

    it('should not allow deleting a channel endpoint from another context', async () => {
      const endpointB = await createEndpoint(session, slackIntegrationIdentifier, [
        'project:project-b',
        'tenant:tenant-b',
      ]);

      const deleteAttempt = await deleteChannelEndpoint(session, endpointB.identifier, contextAToken);
      expect(deleteAttempt.status).to.equal(404);

      const stillThere = await channelEndpointRepository.findOne({
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
        identifier: endpointB.identifier,
      });
      expect(stillThere).to.exist;

      const ownDelete = await deleteChannelEndpoint(session, endpointB.identifier, contextBToken);
      expect(ownDelete.status).to.equal(204);

      const removed = await channelEndpointRepository.findOne({
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
        identifier: endpointB.identifier,
      });
      expect(removed).to.be.null;
    });
  });

  async function createConnection(userSession: UserSession, integrationIdentifier: string, contextKeys: string[]) {
    return channelConnectionRepository.create({
      _environmentId: userSession.environment._id,
      _organizationId: userSession.organization._id,
      identifier: `conn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      integrationIdentifier,
      providerId: ChatProviderIdEnum.Slack,
      channel: ChannelTypeEnum.CHAT,
      subscriberId: userSession.subscriberId,
      contextKeys,
      workspace: { id: `T${Date.now()}`, name: 'Test' },
      auth: { accessToken: `xoxb-${Date.now()}` },
    });
  }

  async function createEndpoint(userSession: UserSession, integrationIdentifier: string, contextKeys: string[]) {
    return channelEndpointRepository.create({
      _environmentId: userSession.environment._id,
      _organizationId: userSession.organization._id,
      identifier: `ep-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      integrationIdentifier,
      providerId: ChatProviderIdEnum.Slack,
      channel: ChannelTypeEnum.CHAT,
      subscriberId: userSession.subscriberId,
      contextKeys,
      type: ENDPOINT_TYPES.SLACK_CHANNEL,
      endpoint: { channelId: `C${Date.now()}` },
    });
  }
});

async function initializeSessionWithContext(session: UserSession, context?: ContextPayload) {
  return await session.testAgent.post('/v1/inbox/session').send({
    applicationIdentifier: session.environment.identifier,
    subscriberId: session.subscriberId,
    context,
  });
}

async function ensureInAppIntegrationActive(environmentId: string, organizationId: string) {
  await integrationRepository.update(
    {
      _environmentId: environmentId,
      _organizationId: organizationId,
      providerId: InAppProviderIdEnum.Novu,
      channel: ChannelTypeEnum.IN_APP,
    },
    {
      $set: {
        'credentials.hmac': false,
        active: true,
      },
    }
  );
}

async function createSlackIntegration(session: UserSession): Promise<string> {
  const identifier = `slack-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await integrationRepository.create({
    _organizationId: session.organization._id,
    _environmentId: session.environment._id,
    providerId: ChatProviderIdEnum.Slack,
    channel: ChannelTypeEnum.CHAT,
    credentials: {},
    active: true,
    identifier,
  });

  return identifier;
}

async function listChannelConnections(session: UserSession, token: string) {
  return await session.testAgent.get('/v1/inbox/channel-connections').set('Authorization', `Bearer ${token}`);
}

async function getChannelConnection(session: UserSession, identifier: string, token: string) {
  return await session.testAgent
    .get(`/v1/inbox/channel-connections/${identifier}`)
    .set('Authorization', `Bearer ${token}`);
}

async function deleteChannelConnection(session: UserSession, identifier: string, token: string) {
  return await session.testAgent
    .delete(`/v1/inbox/channel-connections/${identifier}`)
    .set('Authorization', `Bearer ${token}`);
}

async function listChannelEndpoints(session: UserSession, token: string) {
  return await session.testAgent.get('/v1/inbox/channel-endpoints').set('Authorization', `Bearer ${token}`);
}

async function deleteChannelEndpoint(session: UserSession, identifier: string, token: string) {
  return await session.testAgent
    .delete(`/v1/inbox/channel-endpoints/${identifier}`)
    .set('Authorization', `Bearer ${token}`);
}
