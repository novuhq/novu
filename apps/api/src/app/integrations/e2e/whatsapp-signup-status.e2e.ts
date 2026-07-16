import { ChannelTypeEnum, ChatProviderIdEnum, FeatureFlagsKeysEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';

const mutableEnv = process.env as Record<string, string | undefined>;

/**
 * Coverage for the two secret-free WhatsApp endpoints the connect CLI polls:
 * - GET /v1/integrations/whatsapp/embedded-signup/availability
 * - GET /v1/integrations/whatsapp/signup-status
 *
 * Both must be callable with the API-key auth scheme (the CLI authenticates
 * with a secret key), and signup-status must never leak credential values.
 */
describe('WhatsApp embedded signup endpoints - /integrations/whatsapp #novu-v2', () => {
  let session: UserSession;

  const previousFlag = process.env[FeatureFlagsKeysEnum.IS_WHATSAPP_EMBEDDED_SIGNUP_ENABLED];
  const previousAppId = process.env.NOVU_WHATSAPP_APP_ID;
  const previousAppSecret = process.env.NOVU_WHATSAPP_APP_SECRET;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  afterEach(() => {
    restoreEnv(FeatureFlagsKeysEnum.IS_WHATSAPP_EMBEDDED_SIGNUP_ENABLED, previousFlag);
    restoreEnv('NOVU_WHATSAPP_APP_ID', previousAppId);
    restoreEnv('NOVU_WHATSAPP_APP_SECRET', previousAppSecret);
  });

  function restoreEnv(key: string, previousValue: string | undefined) {
    if (previousValue === undefined) {
      delete mutableEnv[key];
    } else {
      mutableEnv[key] = previousValue;
    }
  }

  async function createWhatsAppIntegration(credentials: Record<string, string>) {
    const { body } = await session.testAgent.post('/v1/integrations').send({
      providerId: ChatProviderIdEnum.WhatsAppBusiness,
      channel: ChannelTypeEnum.CHAT,
      name: 'WhatsApp e2e',
      credentials,
      active: true,
      check: false,
    });

    expect(body.data, JSON.stringify(body)).to.exist;

    return body.data as { _id: string; identifier: string };
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

      const { body, status } = await session.testAgent
        .get('/v1/integrations/whatsapp/embedded-signup/availability')
        .set('authorization', `ApiKey ${session.apiKey}`);

      expect(status).to.equal(200);
      expect(body.data.available).to.equal(false);
      expect(body.data.reason).to.equal('missing_platform_config');
    });

    it('reports available when the flag is on and Meta credentials are configured', async () => {
      mutableEnv[FeatureFlagsKeysEnum.IS_WHATSAPP_EMBEDDED_SIGNUP_ENABLED] = 'true';
      mutableEnv.NOVU_WHATSAPP_APP_ID = 'test-app-id';
      mutableEnv.NOVU_WHATSAPP_APP_SECRET = 'test-app-secret';

      const { body, status } = await session.testAgent
        .get('/v1/integrations/whatsapp/embedded-signup/availability')
        .set('authorization', `ApiKey ${session.apiKey}`);

      expect(status).to.equal(200);
      expect(body.data.available).to.equal(true);
      expect(body.data.reason).to.not.exist;
    });
  });

  describe('GET /v1/integrations/whatsapp/signup-status', () => {
    it('returns 400 when integrationIdentifier is missing', async () => {
      const { status } = await session.testAgent
        .get('/v1/integrations/whatsapp/signup-status')
        .set('authorization', `ApiKey ${session.apiKey}`);

      expect(status).to.equal(400);
    });

    it('returns 404 for an unknown integration identifier', async () => {
      const { status } = await session.testAgent
        .get('/v1/integrations/whatsapp/signup-status?integrationIdentifier=does-not-exist')
        .set('authorization', `ApiKey ${session.apiKey}`);

      expect(status).to.equal(404);
    });

    it('reports credentialsSaved false for a fresh integration without send credentials', async () => {
      const integration = await createWhatsAppIntegration({});

      const { body, status } = await session.testAgent
        .get(`/v1/integrations/whatsapp/signup-status?integrationIdentifier=${integration.identifier}`)
        .set('authorization', `ApiKey ${session.apiKey}`);

      expect(status).to.equal(200);
      expect(body.data.credentialsSaved).to.equal(false);
      expect(body.data.displayPhoneNumber).to.not.exist;
    });

    it('reports credentialsSaved true with the public phone number once send credentials are saved', async () => {
      const integration = await createWhatsAppIntegration({
        apiToken: 'meta-access-token',
        phoneNumberIdentification: '1234567890',
        businessAccountId: '9876543210',
        from: '+1 555-123-4567',
      });

      const { body, status } = await session.testAgent
        .get(`/v1/integrations/whatsapp/signup-status?integrationIdentifier=${integration.identifier}`)
        .set('authorization', `ApiKey ${session.apiKey}`);

      expect(status).to.equal(200);
      expect(body.data.credentialsSaved).to.equal(true);
      expect(body.data.displayPhoneNumber).to.equal('+1 555-123-4567');
      // Secret-free contract: no credential values in the response body.
      expect(JSON.stringify(body)).to.not.include('meta-access-token');
    });

    it('reports credentialsSaved false while only part of the send credentials are present', async () => {
      const integration = await createWhatsAppIntegration({
        apiToken: 'meta-access-token',
        phoneNumberIdentification: '1234567890',
      });

      const { body, status } = await session.testAgent
        .get(`/v1/integrations/whatsapp/signup-status?integrationIdentifier=${integration.identifier}`)
        .set('authorization', `ApiKey ${session.apiKey}`);

      expect(status).to.equal(200);
      expect(body.data.credentialsSaved).to.equal(false);
    });
  });
});
