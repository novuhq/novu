import { decryptChannelConnectionAuth, encodeOAuthState, encryptCredentials } from '@novu/application-generic';
import {
  ChannelConnectionRepository,
  EnvironmentRepository,
  IntegrationRepository,
  SubscriberRepository,
} from '@novu/dal';
import { ChannelTypeEnum, ChatProviderIdEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import axios from 'axios';
import { expect } from 'chai';
import { createHmac } from 'crypto';
import sinon from 'sinon';

const integrationRepository = new IntegrationRepository();
const environmentRepository = new EnvironmentRepository();
const channelConnectionRepository = new ChannelConnectionRepository();
const subscriberRepository = new SubscriberRepository();

const SUBSCRIBER_ID = 'rotation-e2e-subscriber';

const SLACK_ACCESS_TOKEN = 'xoxe.xoxb-e2e-access-token';
const SLACK_REFRESH_TOKEN = 'xoxe-1-e2e-refresh-token';
const SLACK_TEAM = { id: 'T0E2E', name: 'Rotation E2E Workspace' };

/**
 * Coverage for Slack apps with token rotation enabled (NV-8121): the OAuth
 * callback must persist the `refresh_token` and computed `expiresAt` returned
 * by Slack's `oauth.v2.access`, while legacy apps (no rotation) keep storing
 * only the long-lived access token.
 */
describe('Slack OAuth callback token rotation - /integrations/chat/oauth/callback (GET) #novu-v2', () => {
  let session: UserSession;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();

    await subscriberRepository.create({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      subscriberId: SUBSCRIBER_ID,
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  async function seedSlackIntegration() {
    return await integrationRepository.create({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      providerId: ChatProviderIdEnum.Slack,
      channel: ChannelTypeEnum.CHAT,
      credentials: encryptCredentials({ clientId: 'slack-client-id', secretKey: 'slack-client-secret' }),
      active: true,
      name: 'Slack Rotation E2E',
      identifier: `slack-rotation-e2e-${Date.now()}`,
      priority: 1,
      primary: false,
      deleted: false,
    });
  }

  async function buildSignedState(integrationIdentifier: string): Promise<string> {
    const environment = await environmentRepository.findOne({ _id: session.environment._id });
    const environmentApiKey = environment?.apiKeys?.[0]?.key;
    expect(environmentApiKey, 'environment api key must exist to sign OAuth state').to.exist;

    const payloadStr = JSON.stringify({
      environmentId: session.environment._id,
      organizationId: session.organization._id,
      integrationIdentifier,
      providerId: ChatProviderIdEnum.Slack,
      subscriberId: SUBSCRIBER_ID,
      timestamp: Date.now(),
    });
    const signature = createHmac('sha256', environmentApiKey as string)
      .update(payloadStr)
      .digest('hex');

    return encodeOAuthState(payloadStr, signature);
  }

  function stubSlackOauthAccess(response: Record<string, unknown>) {
    return sinon.stub(axios, 'post').resolves({ data: response });
  }

  async function invokeCallback(state: string) {
    return await session.testAgent.get('/v1/integrations/chat/oauth/callback').query({ code: 'e2e-code', state });
  }

  async function findConnection(integrationIdentifier: string) {
    return await channelConnectionRepository.findOne({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      integrationIdentifier,
    });
  }

  it('persists refreshToken and expiresAt when Slack returns rotation credentials', async () => {
    const integration = await seedSlackIntegration();
    const state = await buildSignedState(integration.identifier);

    stubSlackOauthAccess({
      ok: true,
      access_token: SLACK_ACCESS_TOKEN,
      refresh_token: SLACK_REFRESH_TOKEN,
      expires_in: 12 * 60 * 60,
      team: SLACK_TEAM,
    });

    const { status, text } = await invokeCallback(state);
    expect(status, text).to.equal(200);

    const connection = await findConnection(integration.identifier);
    expect(connection, 'workspace connection should be created').to.exist;

    // Secrets must be encrypted at rest
    expect((connection!.auth as { accessToken: string }).accessToken.startsWith('nvsk.')).to.equal(true);
    expect((connection!.auth as { refreshToken: string }).refreshToken.startsWith('nvsk.')).to.equal(true);

    const decrypted = decryptChannelConnectionAuth(connection!.auth) as {
      accessToken: string;
      refreshToken?: string;
      expiresAt?: string;
    };
    expect(decrypted.accessToken).to.equal(SLACK_ACCESS_TOKEN);
    expect(decrypted.refreshToken).to.equal(SLACK_REFRESH_TOKEN);
    expect(decrypted.expiresAt, 'expiresAt should be persisted').to.exist;
    const expiresAtTime = new Date(decrypted.expiresAt as string).getTime();
    expect(expiresAtTime).to.be.greaterThan(Date.now() + 11 * 60 * 60 * 1000);
    expect(expiresAtTime).to.be.lessThan(Date.now() + 13 * 60 * 60 * 1000);

    expect(connection!.workspace?.id).to.equal(SLACK_TEAM.id);
  });

  it('stores only the access token for legacy apps without token rotation', async () => {
    const integration = await seedSlackIntegration();
    const state = await buildSignedState(integration.identifier);

    stubSlackOauthAccess({
      ok: true,
      access_token: SLACK_ACCESS_TOKEN,
      team: SLACK_TEAM,
    });

    const { status, text } = await invokeCallback(state);
    expect(status, text).to.equal(200);

    const connection = await findConnection(integration.identifier);
    expect(connection).to.exist;

    const decrypted = decryptChannelConnectionAuth(connection!.auth) as {
      accessToken: string;
      refreshToken?: string;
      expiresAt?: string;
    };
    expect(decrypted.accessToken).to.equal(SLACK_ACCESS_TOKEN);
    expect(decrypted.refreshToken).to.equal(undefined);
    expect(decrypted.expiresAt).to.equal(undefined);
  });
});
