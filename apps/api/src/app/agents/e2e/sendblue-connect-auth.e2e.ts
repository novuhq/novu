/**
 * Guards the CLI-connect auth change: the Sendblue agent endpoints
 * (configure-webhook, test-message, remove-webhooks) must be reachable with a
 * user API key (`@ExternalApiAccessible()`), not only a dashboard JWT. Before
 * the decorators were added these returned 401 for API-key callers, which broke
 * the keyless/secret-key `novu connect` flow. Sendblue's HTTP API is faked by
 * the in-process stub so we exercise the real usecases without the vendor API.
 */
import { encryptCredentials } from '@novu/application-generic';
import { AgentIntegrationRepository, IntegrationRepository, SubscriberRepository } from '@novu/dal';
import { ChannelTypeEnum, ChatProviderIdEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { type SendblueApiStub, startSendblueApiStub } from './helpers/sendblue-api-stub';

const integrationRepository = new IntegrationRepository();
const agentIntegrationRepository = new AgentIntegrationRepository();
const subscriberRepository = new SubscriberRepository();

const AGENT_PHONE = '+15122164639';
const RECIPIENT_PHONE = '+19998887777';

describe('Sendblue connect endpoints - API key access #novu-v2', () => {
  let session: UserSession;
  let agentIdentifier: string;
  let integrationIdentifier: string;
  let sendblueApiStub: SendblueApiStub;

  before(async () => {
    process.env.IS_CONVERSATIONAL_AGENTS_ENABLED = 'true';
    sendblueApiStub = await startSendblueApiStub();
  });

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();

    agentIdentifier = `e2e-sb-auth-agent-${Date.now()}`;
    const createRes = await session.testAgent.post('/v1/agents').send({
      name: 'Sendblue Connect Auth Agent',
      identifier: agentIdentifier,
    });
    const agentId = createRes.body.data._id as string;

    const integration = await integrationRepository.create({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      providerId: ChatProviderIdEnum.Sendblue,
      channel: ChannelTypeEnum.CHAT,
      credentials: encryptCredentials({
        apiKey: 'e2e-sendblue-api-key',
        secretKey: 'e2e-sendblue-secret-key',
        from: AGENT_PHONE,
      }),
      active: true,
      name: 'Sendblue Connect Auth Integration',
      identifier: `sendblue-auth-e2e-${Date.now()}`,
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
    sendblueApiStub.reset();
  });

  const apiKeyAuth = () => `ApiKey ${session.apiKey}`;

  it('configures the webhook when called with a user API key', async () => {
    const res = await session.testAgent
      .post(`/v1/agents/${agentIdentifier}/integrations/${integrationIdentifier}/sendblue/configure-webhook`)
      .set('authorization', apiKeyAuth())
      .send({});

    expect(res.status).to.equal(200);
    expect(res.body.data.success).to.equal(true);
    expect(res.body.data.callbackUrl).to.be.a('string');
  });

  it('sends a test message when called with a user API key', async () => {
    const subscriberId = `connect-keyless:sb-auth-${Date.now()}`;
    await subscriberRepository.create({
      subscriberId,
      phone: RECIPIENT_PHONE,
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
    });

    const res = await session.testAgent
      .post(`/v1/agents/${agentIdentifier}/integrations/${integrationIdentifier}/sendblue/test-message`)
      .set('authorization', apiKeyAuth())
      .send({ subscriberId });

    // The API-key caller reaches the usecase (200, not a 401 auth rejection).
    // We don't assert `success: true` because the outbound send goes to the
    // real Sendblue API (SendblueChatProvider ignores the local stub), so the
    // boolean depends on the environment — the point here is auth, not delivery.
    expect(res.status).to.equal(200);
    expect(res.body.data).to.have.property('success');
    expect(res.body.data.success).to.be.a('boolean');
  });

  it('removes stale webhooks when called with a user API key', async () => {
    const res = await session.testAgent
      .post(`/v1/agents/${agentIdentifier}/integrations/${integrationIdentifier}/sendblue/remove-webhooks`)
      .set('authorization', apiKeyAuth())
      .send({ webhookUrls: [`https://example.test/v1/agents/some-agent/webhook/${integrationIdentifier}`] });

    expect(res.status).to.equal(200);
    expect(res.body.data.success).to.equal(true);
  });
});
