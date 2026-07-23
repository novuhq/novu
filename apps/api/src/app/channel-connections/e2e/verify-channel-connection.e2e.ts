import { decryptChannelConnectionAuth, encryptChannelConnectionAuth } from '@novu/application-generic';
import { ChannelConnectionRepository, IntegrationRepository } from '@novu/dal';
import { ChannelTypeEnum, ChatProviderIdEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import axios from 'axios';
import { expect } from 'chai';
import sinon from 'sinon';

const NOVU_ENCRYPTION_PREFIX = 'nvsk.';

const OLD_ACCESS_TOKEN = 'xoxe.xoxb-stale-access-token';
const PASTED_REFRESH_TOKEN = 'xoxe-1-manually-pasted-refresh-token';
const NEW_ACCESS_TOKEN = 'xoxe.xoxb-freshly-exchanged-access-token';
const NEW_REFRESH_TOKEN = 'xoxe-1-freshly-exchanged-refresh-token';

/**
 * Coverage for `POST /channel-connections/:identifier/verify`: forces an immediate
 * check of a connection's stored auth against the provider so a manually pasted
 * refresh token (or a stale/regenerated one) fails fast instead of only surfacing
 * on the next real send. Delegates to the same `RotatingConnectionTokenService`
 * used by automatic pre-send refresh, so exchange behavior is covered by its own
 * spec — this file covers the endpoint/usecase wiring.
 */
describe('Verify Channel Connection - /channel-connections/:identifier/verify (POST) #novu-v2', () => {
  let session: UserSession;
  const integrationRepository = new IntegrationRepository();
  const channelConnectionRepository = new ChannelConnectionRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  afterEach(() => {
    sinon.restore();
  });

  async function seedIntegration() {
    return await integrationRepository.create({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
      providerId: ChatProviderIdEnum.Slack,
      channel: ChannelTypeEnum.CHAT,
      credentials: { clientId: 'slack-client-id', secretKey: 'slack-client-secret' },
      active: true,
      identifier: `slack-verify-${Date.now()}`,
    });
  }

  async function seedConnection(
    integrationIdentifier: string,
    auth: { accessToken: string; refreshToken?: string; expiresAt?: string }
  ) {
    return await channelConnectionRepository.create({
      identifier: `chconn_verify_${Date.now()}`,
      integrationIdentifier,
      providerId: ChatProviderIdEnum.Slack,
      channel: ChannelTypeEnum.CHAT,
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
      subscriberId: 'verify-e2e-subscriber',
      contextKeys: [],
      workspace: { id: 'T_verify', name: 'Verify Workspace' },
      auth: encryptChannelConnectionAuth(auth),
    });
  }

  async function findConnection(identifier: string) {
    return await channelConnectionRepository.findOne({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      identifier,
    });
  }

  function stubSlackRefreshResponse(response: Record<string, unknown>) {
    return sinon.stub(axios, 'post').resolves({ data: response });
  }

  it('exchanges a due-for-refresh auth and persists the new token pair', async () => {
    const integration = await seedIntegration();
    const pastExpiry = new Date(Date.now() - 60 * 1000).toISOString();
    const connection = await seedConnection(integration.identifier, {
      accessToken: OLD_ACCESS_TOKEN,
      refreshToken: PASTED_REFRESH_TOKEN,
      expiresAt: pastExpiry,
    });

    stubSlackRefreshResponse({
      ok: true,
      access_token: NEW_ACCESS_TOKEN,
      refresh_token: NEW_REFRESH_TOKEN,
      expires_in: 12 * 60 * 60,
    });

    const { status, body } = await session.testAgent.post(`/v1/channel-connections/${connection.identifier}/verify`);

    expect(status, JSON.stringify(body)).to.equal(200);
    expect(body.data.auth.accessToken).to.equal(NEW_ACCESS_TOKEN);
    expect(body.data.auth.refreshToken).to.equal(NEW_REFRESH_TOKEN);

    const stored = await findConnection(connection.identifier);
    expect((stored!.auth as { accessToken: string }).accessToken.startsWith(NOVU_ENCRYPTION_PREFIX)).to.equal(true);

    const decrypted = decryptChannelConnectionAuth(stored!.auth) as {
      accessToken: string;
      refreshToken?: string;
      expiresAt?: string;
    };
    expect(decrypted.accessToken).to.equal(NEW_ACCESS_TOKEN);
    expect(decrypted.refreshToken).to.equal(NEW_REFRESH_TOKEN);
    expect(new Date(decrypted.expiresAt as string).getTime()).to.be.greaterThan(Date.now());
  });

  it('returns a clear error and leaves stored auth untouched when the refresh token is invalid or already used', async () => {
    const integration = await seedIntegration();
    const pastExpiry = new Date(Date.now() - 60 * 1000).toISOString();
    const connection = await seedConnection(integration.identifier, {
      accessToken: OLD_ACCESS_TOKEN,
      refreshToken: PASTED_REFRESH_TOKEN,
      expiresAt: pastExpiry,
    });

    stubSlackRefreshResponse({ ok: false, error: 'invalid_refresh_token' });

    const { status } = await session.testAgent.post(`/v1/channel-connections/${connection.identifier}/verify`);

    expect(status).to.equal(502);

    const stored = await findConnection(connection.identifier);
    const decrypted = decryptChannelConnectionAuth(stored!.auth) as { accessToken: string; refreshToken?: string };
    expect(decrypted.accessToken).to.equal(OLD_ACCESS_TOKEN);
    expect(decrypted.refreshToken).to.equal(PASTED_REFRESH_TOKEN);
  });

  it('is a no-op success for a legacy connection with no refreshToken', async () => {
    const integration = await seedIntegration();
    const connection = await seedConnection(integration.identifier, { accessToken: OLD_ACCESS_TOKEN });

    const postStub = sinon.stub(axios, 'post').resolves({ data: {} });

    const { status, body } = await session.testAgent.post(`/v1/channel-connections/${connection.identifier}/verify`);

    expect(status, JSON.stringify(body)).to.equal(200);
    expect(body.data.auth.accessToken).to.equal(OLD_ACCESS_TOKEN);
    expect(postStub.called, 'legacy (non-rotating) auth should never call out to Slack').to.equal(false);
  });

  it('returns 404 for an unknown connection identifier', async () => {
    const { status } = await session.testAgent.post('/v1/channel-connections/does-not-exist/verify');

    expect(status).to.equal(404);
  });
});
