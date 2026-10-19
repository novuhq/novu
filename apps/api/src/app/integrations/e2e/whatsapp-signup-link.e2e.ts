import { encryptCredentials } from '@novu/application-generic';
import { AgentIntegrationRepository, AgentRepository, IntegrationRepository } from '@novu/dal';
import { ChannelTypeEnum, ChatProviderIdEnum, FeatureFlagsKeysEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';

const mutableEnv = process.env as Record<string, string | undefined>;

const integrationRepository = new IntegrationRepository();
const agentRepository = new AgentRepository();
const agentIntegrationRepository = new AgentIntegrationRepository();

/**
 * Coverage for the tokenized WhatsApp Embedded Signup surface used by the
 * connect CLI (keyless and authenticated) and the public signup page:
 * - GET  /v1/integrations/whatsapp/embedded-signup/availability (API-key auth)
 * - POST /v1/integrations/whatsapp/signup-link (API-key auth, mints the token)
 * - GET  /v1/integrations/whatsapp/signup/status?token= (public)
 * - POST /v1/integrations/whatsapp/signup (public, single-use claim + release)
 *
 * The happy-path completion is not covered here because it requires the Meta
 * Graph API; the release-on-failure path is exercised via the feature flag.
 */
describe('WhatsApp signup link endpoints - /integrations/whatsapp #novu-v2', () => {
  let session: UserSession;

  const previousFlag = process.env[FeatureFlagsKeysEnum.IS_WHATSAPP_EMBEDDED_SIGNUP_ENABLED];
  const previousAppId = process.env.NOVU_WHATSAPP_APP_ID;
  const previousAppSecret = process.env.NOVU_WHATSAPP_APP_SECRET;
  const previousConfigId = process.env.NOVU_WHATSAPP_CONFIG_ID;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  afterEach(() => {
    restoreEnv(FeatureFlagsKeysEnum.IS_WHATSAPP_EMBEDDED_SIGNUP_ENABLED, previousFlag);
    restoreEnv('NOVU_WHATSAPP_APP_ID', previousAppId);
    restoreEnv('NOVU_WHATSAPP_APP_SECRET', previousAppSecret);
    restoreEnv('NOVU_WHATSAPP_CONFIG_ID', previousConfigId);
  });

  function restoreEnv(key: string, previousValue: string | undefined) {
    if (previousValue === undefined) {
      delete mutableEnv[key];
    } else {
      mutableEnv[key] = previousValue;
    }
  }

  function enableEmbeddedSignup() {
    mutableEnv[FeatureFlagsKeysEnum.IS_WHATSAPP_EMBEDDED_SIGNUP_ENABLED] = 'true';
    mutableEnv.NOVU_WHATSAPP_APP_ID = 'test-app-id';
    mutableEnv.NOVU_WHATSAPP_APP_SECRET = 'test-app-secret';
    mutableEnv.NOVU_WHATSAPP_CONFIG_ID = 'test-config-id';
  }

  async function seedAgentWithWhatsAppIntegration(credentials: Record<string, string> = {}) {
    const agentIdentifier = `wa-signup-agent-${Date.now()}`;
    const createRes = await session.testAgent.post('/v1/agents').send({
      name: 'WhatsApp Signup E2E Agent',
      identifier: agentIdentifier,
    });
    const agentId = createRes.body.data._id as string;
    expect(agentId, JSON.stringify(createRes.body)).to.exist;

    const integration = await integrationRepository.create({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      providerId: ChatProviderIdEnum.WhatsAppBusiness,
      channel: ChannelTypeEnum.CHAT,
      credentials: encryptCredentials(credentials),
      active: true,
      name: 'WhatsApp Signup E2E',
      identifier: `whatsapp-signup-e2e-${Date.now()}`,
      priority: 1,
      primary: false,
      deleted: false,
    });

    await agentIntegrationRepository.create({
      _agentId: agentId,
      _integrationId: integration._id,
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
    });

    return { agentIdentifier, integrationIdentifier: integration.identifier, integrationId: integration._id };
  }

  async function mintSignupLink(agentIdentifier: string, integrationIdentifier: string) {
    const { body, status } = await session.testAgent
      .post('/v1/integrations/whatsapp/signup-link')
      .set('authorization', `ApiKey ${session.apiKey}`)
      .send({ agentIdentifier, integrationIdentifier });

    expect(status, JSON.stringify(body)).to.equal(200);

    return body.data as { token: string; url: string; expiresAt: string };
  }

  describe('GET /v1/integrations/whatsapp/embedded-signup/availability', () => {
    it('reports unavailable with feature_disabled when the flag is off', async () => {
      delete mutableEnv[FeatureFlagsKeysEnum.IS_WHATSAPP_EMBEDDED_SIGNUP_ENABLED];

      const { body, status } = await session.testAgent
        .get('/v1/integrations/whatsapp/embedded-signup/availability')
        .set('authorization', `ApiKey ${session.apiKey}`);

      expect(status).to.equal(200);
      expect(body.data.available).to.equal(false);
      expect(body.data.reason).to.equal('feature_disabled');
    });

    it('reports unavailable with missing_platform_config when Meta credentials are absent', async () => {
      mutableEnv[FeatureFlagsKeysEnum.IS_WHATSAPP_EMBEDDED_SIGNUP_ENABLED] = 'true';
      delete mutableEnv.NOVU_WHATSAPP_APP_ID;
      delete mutableEnv.NOVU_WHATSAPP_APP_SECRET;
      delete mutableEnv.NOVU_WHATSAPP_CONFIG_ID;

      const { body, status } = await session.testAgent
        .get('/v1/integrations/whatsapp/embedded-signup/availability')
        .set('authorization', `ApiKey ${session.apiKey}`);

      expect(status).to.equal(200);
      expect(body.data.available).to.equal(false);
      expect(body.data.reason).to.equal('missing_platform_config');
    });

    it('reports unavailable with missing_platform_config when Meta config id is absent', async () => {
      mutableEnv[FeatureFlagsKeysEnum.IS_WHATSAPP_EMBEDDED_SIGNUP_ENABLED] = 'true';
      mutableEnv.NOVU_WHATSAPP_APP_ID = 'test-app-id';
      mutableEnv.NOVU_WHATSAPP_APP_SECRET = 'test-app-secret';
      delete mutableEnv.NOVU_WHATSAPP_CONFIG_ID;

      const { body, status } = await session.testAgent
        .get('/v1/integrations/whatsapp/embedded-signup/availability')
        .set('authorization', `ApiKey ${session.apiKey}`);

      expect(status).to.equal(200);
      expect(body.data.available).to.equal(false);
      expect(body.data.reason).to.equal('missing_platform_config');
    });

    it('reports available when the flag is on and Meta credentials are configured', async () => {
      enableEmbeddedSignup();

      const { body, status } = await session.testAgent
        .get('/v1/integrations/whatsapp/embedded-signup/availability')
        .set('authorization', `ApiKey ${session.apiKey}`);

      expect(status).to.equal(200);
      expect(body.data.available).to.equal(true);
      expect(body.data.reason).to.not.exist;
    });
  });

  describe('POST /v1/integrations/whatsapp/signup-link', () => {
    it('returns 400 when embedded signup is unavailable', async () => {
      delete mutableEnv[FeatureFlagsKeysEnum.IS_WHATSAPP_EMBEDDED_SIGNUP_ENABLED];
      const { agentIdentifier, integrationIdentifier } = await seedAgentWithWhatsAppIntegration();

      const { status } = await session.testAgent
        .post('/v1/integrations/whatsapp/signup-link')
        .set('authorization', `ApiKey ${session.apiKey}`)
        .send({ agentIdentifier, integrationIdentifier });

      expect(status).to.equal(400);
    });

    it('returns 404 for an unknown integration identifier', async () => {
      enableEmbeddedSignup();
      const { agentIdentifier } = await seedAgentWithWhatsAppIntegration();

      const { status } = await session.testAgent
        .post('/v1/integrations/whatsapp/signup-link')
        .set('authorization', `ApiKey ${session.apiKey}`)
        .send({ agentIdentifier, integrationIdentifier: 'does-not-exist' });

      expect(status).to.equal(404);
    });

    it('returns 404 when the integration is not linked to the agent', async () => {
      enableEmbeddedSignup();
      const { agentIdentifier } = await seedAgentWithWhatsAppIntegration();

      const orphanIntegration = await integrationRepository.create({
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
        providerId: ChatProviderIdEnum.WhatsAppBusiness,
        channel: ChannelTypeEnum.CHAT,
        credentials: encryptCredentials({}),
        active: true,
        name: 'WhatsApp orphan',
        identifier: `whatsapp-orphan-${Date.now()}`,
        priority: 1,
        primary: false,
        deleted: false,
      });

      const { status } = await session.testAgent
        .post('/v1/integrations/whatsapp/signup-link')
        .set('authorization', `ApiKey ${session.apiKey}`)
        .send({ agentIdentifier, integrationIdentifier: orphanIntegration.identifier });

      expect(status).to.equal(404);
    });

    it('mints a public signup URL with an opaque token and 30-minute expiry', async () => {
      enableEmbeddedSignup();
      const { agentIdentifier, integrationIdentifier } = await seedAgentWithWhatsAppIntegration();

      const link = await mintSignupLink(agentIdentifier, integrationIdentifier);

      expect(link.token).to.match(/^[A-Za-z0-9]{32}$/);
      expect(link.url).to.include(`/agents/whatsapp/connect/${link.token}`);
      const remainingMs = Date.parse(link.expiresAt) - Date.now();
      expect(remainingMs).to.be.within(29 * 60 * 1000, 31 * 60 * 1000);
    });
  });

  describe('GET /v1/integrations/whatsapp/signup/status (public)', () => {
    it('reports invalid for a malformed token without authentication', async () => {
      const { body, status } = await session.testAgent.get('/v1/integrations/whatsapp/signup/status?token=nope');

      expect(status).to.equal(200);
      expect(body.data.valid).to.equal(false);
      expect(body.data.reason).to.equal('invalid');
    });

    it('reports expired for a well-formed but unknown token', async () => {
      const { body, status } = await session.testAgent.get(
        `/v1/integrations/whatsapp/signup/status?token=${'a'.repeat(32)}`
      );

      expect(status).to.equal(200);
      expect(body.data.valid).to.equal(false);
      expect(body.data.reason).to.equal('expired');
    });

    it('reports valid with the agent name and credentialsSaved false for a fresh link', async () => {
      enableEmbeddedSignup();
      const { agentIdentifier, integrationIdentifier } = await seedAgentWithWhatsAppIntegration();
      const link = await mintSignupLink(agentIdentifier, integrationIdentifier);

      const { body, status } = await session.testAgent.get(
        `/v1/integrations/whatsapp/signup/status?token=${link.token}`
      );

      expect(status).to.equal(200);
      expect(body.data.valid).to.equal(true);
      expect(body.data.agentName).to.equal('WhatsApp Signup E2E Agent');
      expect(body.data.credentialsSaved).to.equal(false);
      expect(body.data.displayPhoneNumber).to.not.exist;
    });

    it('reports credentialsSaved true with the public phone number, without leaking secrets', async () => {
      enableEmbeddedSignup();
      const { agentIdentifier, integrationIdentifier } = await seedAgentWithWhatsAppIntegration({
        apiToken: 'meta-access-token',
        phoneNumberIdentification: '1234567890',
        businessAccountId: '9876543210',
        from: '+1 555-123-4567',
      });
      const link = await mintSignupLink(agentIdentifier, integrationIdentifier);

      const { body, status } = await session.testAgent.get(
        `/v1/integrations/whatsapp/signup/status?token=${link.token}`
      );

      expect(status).to.equal(200);
      expect(body.data.valid).to.equal(true);
      expect(body.data.credentialsSaved).to.equal(true);
      expect(body.data.displayPhoneNumber).to.equal('+1 555-123-4567');
      // Secret-free contract: no credential values in the response body.
      expect(JSON.stringify(body)).to.not.include('meta-access-token');
    });

    it('reports credentialsSaved false while only part of the send credentials are present', async () => {
      enableEmbeddedSignup();
      const { agentIdentifier, integrationIdentifier } = await seedAgentWithWhatsAppIntegration({
        apiToken: 'meta-access-token',
        phoneNumberIdentification: '1234567890',
      });
      const link = await mintSignupLink(agentIdentifier, integrationIdentifier);

      const { body } = await session.testAgent.get(`/v1/integrations/whatsapp/signup/status?token=${link.token}`);

      expect(body.data.valid).to.equal(true);
      expect(body.data.credentialsSaved).to.equal(false);
    });
  });

  describe('POST /v1/integrations/whatsapp/signup (public)', () => {
    const completionBody = {
      code: 'meta-auth-code',
      wabaId: '9876543210',
      phoneNumberId: '1234567890',
    };

    it('returns 401 for a malformed token', async () => {
      const { body, status } = await session.testAgent
        .post('/v1/integrations/whatsapp/signup')
        .send({ ...completionBody, token: 'nope-not-a-token' });

      expect(status).to.equal(401);
      expect(JSON.stringify(body)).to.include('token_invalid');
    });

    it('returns 401 with token_expired for a well-formed but unknown token', async () => {
      const { body, status } = await session.testAgent
        .post('/v1/integrations/whatsapp/signup')
        .send({ ...completionBody, token: 'a'.repeat(32) });

      expect(status).to.equal(401);
      expect(JSON.stringify(body)).to.include('token_expired');
    });

    it('releases the token when the completion fails, so the link stays usable', async () => {
      enableEmbeddedSignup();
      const { agentIdentifier, integrationIdentifier } = await seedAgentWithWhatsAppIntegration();
      const link = await mintSignupLink(agentIdentifier, integrationIdentifier);

      // Disable the flag after minting: the claim succeeds but the embedded
      // signup usecase throws 403 before touching Meta, exercising release.
      delete mutableEnv[FeatureFlagsKeysEnum.IS_WHATSAPP_EMBEDDED_SIGNUP_ENABLED];

      const { status } = await session.testAgent
        .post('/v1/integrations/whatsapp/signup')
        .send({ ...completionBody, token: link.token });

      expect(status).to.equal(403);

      const { body: statusBody } = await session.testAgent.get(
        `/v1/integrations/whatsapp/signup/status?token=${link.token}`
      );
      expect(statusBody.data.valid).to.equal(true);
      expect(statusBody.data.credentialsSaved).to.equal(false);
    });
  });
});
