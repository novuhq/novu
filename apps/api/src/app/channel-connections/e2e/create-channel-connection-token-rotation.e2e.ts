import { decryptChannelConnectionAuth } from '@novu/application-generic';
import { ChannelConnectionRepository, IntegrationRepository } from '@novu/dal';
import { ChannelTypeEnum, ChatProviderIdEnum } from '@novu/shared';
import { SubscribersService, UserSession } from '@novu/testing';
import { expect } from 'chai';

const NOVU_ENCRYPTION_PREFIX = 'nvsk.';

const ACCESS_TOKEN = 'xoxe.xoxb-manual-access-token';
const REFRESH_TOKEN = 'xoxe-1-manual-refresh-token';

/**
 * Coverage for the manual `channelConnections.create` path accepting rotating Slack
 * auth (refreshToken + expiresAt): secrets are persisted encrypted, a missing
 * `expiresAt` is defaulted to now, and rotation auth is rejected when the integration
 * lacks OAuth credentials or the provider does not support rotation.
 */
describe('Create Channel Connection token rotation - /channel-connections (POST) #novu-v2', () => {
  let session: UserSession;
  const integrationRepository = new IntegrationRepository();
  const channelConnectionRepository = new ChannelConnectionRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  async function seedIntegration(overrides: Record<string, unknown> = {}) {
    return await integrationRepository.create({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
      providerId: ChatProviderIdEnum.Slack,
      channel: ChannelTypeEnum.CHAT,
      credentials: { clientId: 'slack-client-id', secretKey: 'slack-client-secret' },
      active: true,
      identifier: `slack-rotation-${Date.now()}`,
      ...overrides,
    });
  }

  async function createSubscriber() {
    const subscribersService = new SubscribersService(session.organization._id, session.environment._id);

    return await subscribersService.createSubscriber();
  }

  async function findConnection(identifier: string) {
    return await channelConnectionRepository.findOne({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      identifier,
    });
  }

  it('persists refreshToken encrypted and keeps the provided expiresAt', async () => {
    const integration = await seedIntegration();
    const subscriber = await createSubscriber();
    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();

    const { status, body } = await session.testAgent.post('/v1/channel-connections').send({
      integrationIdentifier: integration.identifier,
      subscriberId: subscriber.subscriberId,
      workspace: { id: 'T_rotation', name: 'Rotation Workspace' },
      auth: { accessToken: ACCESS_TOKEN, refreshToken: REFRESH_TOKEN, expiresAt },
    });

    expect(status, JSON.stringify(body)).to.equal(201);

    const stored = await findConnection(body.data.identifier);
    expect(stored, 'connection should be created').to.exist;

    expect((stored!.auth as { accessToken: string }).accessToken.startsWith(NOVU_ENCRYPTION_PREFIX)).to.equal(true);
    expect((stored!.auth as { refreshToken: string }).refreshToken.startsWith(NOVU_ENCRYPTION_PREFIX)).to.equal(true);

    const decrypted = decryptChannelConnectionAuth(stored!.auth) as {
      accessToken: string;
      refreshToken?: string;
      expiresAt?: string;
    };
    expect(decrypted.accessToken).to.equal(ACCESS_TOKEN);
    expect(decrypted.refreshToken).to.equal(REFRESH_TOKEN);
    expect(decrypted.expiresAt).to.equal(expiresAt);
  });

  it('defaults expiresAt to now when a refreshToken is provided without one', async () => {
    const integration = await seedIntegration();
    const subscriber = await createSubscriber();
    const before = Date.now();

    const { status, body } = await session.testAgent.post('/v1/channel-connections').send({
      integrationIdentifier: integration.identifier,
      subscriberId: subscriber.subscriberId,
      workspace: { id: 'T_rotation_default', name: 'Rotation Workspace' },
      auth: { accessToken: ACCESS_TOKEN, refreshToken: REFRESH_TOKEN },
    });

    expect(status, JSON.stringify(body)).to.equal(201);

    const stored = await findConnection(body.data.identifier);
    const decrypted = decryptChannelConnectionAuth(stored!.auth) as { expiresAt?: string };

    expect(decrypted.expiresAt, 'expiresAt should be defaulted').to.exist;
    const expiresAtTime = new Date(decrypted.expiresAt as string).getTime();
    expect(expiresAtTime).to.be.gte(before);
    expect(expiresAtTime).to.be.lte(Date.now());
  });

  it('returns refreshToken and expiresAt on retrieve', async () => {
    const integration = await seedIntegration();
    const subscriber = await createSubscriber();
    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();

    const { body: created } = await session.testAgent.post('/v1/channel-connections').send({
      integrationIdentifier: integration.identifier,
      subscriberId: subscriber.subscriberId,
      workspace: { id: 'T_retrieve', name: 'Retrieve Workspace' },
      auth: { accessToken: ACCESS_TOKEN, refreshToken: REFRESH_TOKEN, expiresAt },
    });

    const { status, body } = await session.testAgent.get(`/v1/channel-connections/${created.data.identifier}`);

    expect(status, JSON.stringify(body)).to.equal(200);
    expect(body.data.auth.accessToken).to.equal(ACCESS_TOKEN);
    expect(body.data.auth.refreshToken).to.equal(REFRESH_TOKEN);
    expect(body.data.auth.expiresAt).to.equal(expiresAt);
  });

  it('updates the refreshToken and returns the new value on retrieve', async () => {
    const integration = await seedIntegration();
    const subscriber = await createSubscriber();
    const newRefreshToken = 'xoxe-1-rotated-refresh-token';

    const { body: created } = await session.testAgent.post('/v1/channel-connections').send({
      integrationIdentifier: integration.identifier,
      subscriberId: subscriber.subscriberId,
      workspace: { id: 'T_update', name: 'Update Workspace' },
      auth: { accessToken: ACCESS_TOKEN, refreshToken: REFRESH_TOKEN },
    });

    const { status: patchStatus, body: patchBody } = await session.testAgent
      .patch(`/v1/channel-connections/${created.data.identifier}`)
      .send({
        workspace: { id: 'T_update', name: 'Update Workspace' },
        auth: { accessToken: ACCESS_TOKEN, refreshToken: newRefreshToken },
      });

    expect(patchStatus, JSON.stringify(patchBody)).to.equal(200);

    const { body } = await session.testAgent.get(`/v1/channel-connections/${created.data.identifier}`);
    expect(body.data.auth.refreshToken).to.equal(newRefreshToken);
  });

  it('rejects a refreshToken when the integration has no OAuth credentials', async () => {
    const integration = await seedIntegration({
      identifier: `slack-no-creds-${Date.now()}`,
      credentials: {},
    });
    const subscriber = await createSubscriber();

    const { status } = await session.testAgent.post('/v1/channel-connections').send({
      integrationIdentifier: integration.identifier,
      subscriberId: subscriber.subscriberId,
      workspace: { id: 'T_no_creds', name: 'No Creds Workspace' },
      auth: { accessToken: ACCESS_TOKEN, refreshToken: REFRESH_TOKEN },
    });

    expect(status).to.equal(400);
  });

  it('rejects a refreshToken for a provider that does not support rotation', async () => {
    const integration = await seedIntegration({
      identifier: `discord-${Date.now()}`,
      providerId: ChatProviderIdEnum.Discord,
    });
    const subscriber = await createSubscriber();

    const { status } = await session.testAgent.post('/v1/channel-connections').send({
      integrationIdentifier: integration.identifier,
      subscriberId: subscriber.subscriberId,
      workspace: { id: 'T_discord', name: 'Discord Workspace' },
      auth: { accessToken: ACCESS_TOKEN, refreshToken: REFRESH_TOKEN },
    });

    expect(status).to.equal(400);
  });
});
