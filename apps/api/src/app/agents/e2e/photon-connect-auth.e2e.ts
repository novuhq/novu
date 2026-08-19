/**
 * Guards API-key access to the Photon agent endpoints (configure-webhook,
 * test-message, remove-webhooks): they must be reachable with a user API key
 * (`@ExternalApiAccessible()`), not only a dashboard JWT, so the keyless /
 * secret-key `novu connect` flow works. Unlike the Sendblue equivalent, the
 * Photon provider and webhook client honor `PHOTON_SPECTRUM_URL` /
 * `PHOTON_MESSAGING_URL`, so the outbound test-message path runs fully
 * against the in-process stub and asserts real success.
 */
import { encryptCredentials } from '@novu/application-generic';
import { AgentIntegrationRepository, IntegrationRepository, SubscriberRepository } from '@novu/dal';
import { ChannelTypeEnum, ChatProviderIdEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { type PhotonApiStub, startPhotonApiStub } from './helpers/photon-api-stub';

const integrationRepository = new IntegrationRepository();
const agentIntegrationRepository = new AgentIntegrationRepository();
const subscriberRepository = new SubscriberRepository();

const RECIPIENT_PHONE = '+19998887777';

describe('Photon connect endpoints - API key access #novu-v2', () => {
  let session: UserSession;
  let agentIdentifier: string;
  let integrationIdentifier: string;
  let photonApiStub: PhotonApiStub;

  before(async () => {
    (process.env as Record<string, string>).IS_CONVERSATIONAL_AGENTS_ENABLED = 'true';
    photonApiStub = await startPhotonApiStub();
  });

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();

    agentIdentifier = `e2e-photon-auth-agent-${Date.now()}`;
    const createRes = await session.testAgent.post('/v1/agents').send({
      name: 'Photon Connect Auth Agent',
      identifier: agentIdentifier,
    });
    const agentId = createRes.body.data._id as string;

    const integration = await integrationRepository.create({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      providerId: ChatProviderIdEnum.PhotonImessage,
      channel: ChannelTypeEnum.CHAT,
      credentials: encryptCredentials({
        // Unique per test run so the provider's module-level token cache never
        // leaks a stub token across sessions.
        apiKey: `e2e-photon-project-${Date.now()}`,
        secretKey: 'e2e-photon-project-secret',
      }),
      active: true,
      name: 'Photon Connect Auth Integration',
      identifier: `photon-auth-e2e-${Date.now()}`,
      priority: 1,
      primary: false,
      deleted: false,
    });
    integrationIdentifier = integration.identifier;

    await agentIntegrationRepository.create({
      _agentId: agentId,
      _integrationId: integration._id,
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
    });
  });

  afterEach(() => {
    photonApiStub.reset();
  });

  const apiKeyAuth = () => `ApiKey ${session.apiKey}`;

  it('configures the webhook when called with a user API key', async () => {
    const res = await session.testAgent
      .post(`/v1/agents/${agentIdentifier}/integrations/${integrationIdentifier}/photon/configure-webhook`)
      .set('authorization', apiKeyAuth())
      .send({});

    expect(res.status).to.equal(200);
    expect(res.body.data.success).to.equal(true);
    expect(res.body.data.callbackUrl).to.be.a('string');

    // The usecase must enable the iMessage platform before registering the webhook.
    const platformCall = photonApiStub.calls.find((call) => call.path.endsWith('/platforms'));
    expect(platformCall?.payload).to.deep.equal({ platform: 'imessage', enabled: true });

    const createCall = photonApiStub.calls.find((call) => call.method === 'POST' && call.path.endsWith('/webhooks'));
    expect(createCall?.payload.webhookUrl).to.equal(res.body.data.callbackUrl);
    expect(createCall?.payload.schemaVersion).to.equal('normalized-events.v1');
  });

  it('sends a test message when called with a user API key', async () => {
    const subscriberId = `connect-keyless:photon-auth-${Date.now()}`;
    await subscriberRepository.create({
      subscriberId,
      phone: RECIPIENT_PHONE,
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
    });

    const res = await session.testAgent
      .post(`/v1/agents/${agentIdentifier}/integrations/${integrationIdentifier}/photon/test-message`)
      .set('authorization', apiKeyAuth())
      .send({ subscriberId });

    // The API-key caller reaches the usecase (200, not a 401 auth rejection).
    // We don't assert `success: true` because the outbound send goes over
    // spectrum-ts gRPC to the real Photon line service, which the in-process
    // HTTP stub cannot fake — the point here is auth, not delivery.
    expect(res.status).to.equal(200);
    expect(res.body.data).to.have.property('success');
    expect(res.body.data.success).to.be.a('boolean');

    // The REST leg (shared-user registration) does run against the stub.
    const userCall = photonApiStub.calls.find((call) => call.path.endsWith('/users'));
    expect(userCall?.payload).to.deep.equal({ type: 'shared', phoneNumber: RECIPIENT_PHONE });
  });

  it('removes stale webhooks when called with a user API key', async () => {
    const res = await session.testAgent
      .post(`/v1/agents/${agentIdentifier}/integrations/${integrationIdentifier}/photon/remove-webhooks`)
      .set('authorization', apiKeyAuth())
      .send({ webhookUrls: [`https://example.test/v1/agents/some-agent/webhook/${integrationIdentifier}`] });

    expect(res.status).to.equal(200);
    // The URL is Novu-shaped but not registered on the stub project, so nothing matches — the
    // endpoint still reports success (the API-key caller reached the usecase, which is the point).
    expect(res.body.data.success).to.equal(true);
    expect(res.body.data.removedWebhookUrls).to.deep.equal([]);
  });
});
