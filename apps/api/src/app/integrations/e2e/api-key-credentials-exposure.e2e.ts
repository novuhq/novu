import { ChannelFactory } from '@novu/application-generic';
import { IntegrationRepository } from '@novu/dal';
import { ChannelTypeEnum, EmailProviderIdEnum, SmsProviderIdEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import sinon from 'sinon';

/**
 * Regression coverage for GHSA-rgr9-mpmj-mpw8 / NV-7640:
 * An environment API key must never receive decrypted provider credentials
 * from the integrations endpoints, regardless of RBAC state. OAuth tokens are
 * gated the same way.
 *
 * Session-token (JWT/dashboard) callers must keep receiving decrypted credentials
 * so dashboard flows continue to work. The exception is DELETE: it answers with the
 * environment's remaining integrations, which nobody reads credentials from, so it
 * returns none to any caller.
 */
describe('Integration credentials exposure to API-key auth - /integrations #novu-v2', () => {
  let session: UserSession;
  const integrationRepository = new IntegrationRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  describe('GET /v1/integrations', () => {
    it('should return an empty credentials object when authenticated with an API key', async () => {
      const { body } = await session.testAgent.get('/v1/integrations').set('authorization', `ApiKey ${session.apiKey}`);

      expect(body.data.length).to.be.greaterThan(0);
      for (const integration of body.data) {
        // Older `@novu/api` SDKs declare `credentials` as a required object in
        // their zod schema. Returning `{}` keeps those clients working without
        // exposing any actual credential values to API-key callers.
        expect(integration.credentials).to.deep.equal({});
      }
    });

    it('should still return decrypted credentials when authenticated via session token', async () => {
      const { body } = await session.testAgent.get('/v1/integrations');

      const sendgrid = body.data.find(
        (integration) =>
          integration.providerId === EmailProviderIdEnum.SendGrid &&
          integration._environmentId === session.environment._id
      );

      expect(sendgrid, 'Expected SendGrid integration fixture').to.exist;
      expect(sendgrid.credentials).to.exist;
      expect(sendgrid.credentials.apiKey).to.equal('SG.123');
      expect(sendgrid.credentials.secretKey).to.equal('abc');
    });
  });

  describe('GET /v1/integrations/active', () => {
    it('should return an empty credentials object when authenticated with an API key', async () => {
      const { body } = await session.testAgent
        .get('/v1/integrations/active')
        .set('authorization', `ApiKey ${session.apiKey}`);

      expect(body.data.length).to.be.greaterThan(0);
      for (const integration of body.data) {
        expect(integration.credentials).to.deep.equal({});
      }
    });

    it('should still return decrypted credentials when authenticated via session token', async () => {
      const { body } = await session.testAgent.get('/v1/integrations/active');

      const smsIntegration = body.data.find(
        (integration) =>
          integration.channel === ChannelTypeEnum.SMS &&
          integration.providerId === SmsProviderIdEnum.Twilio &&
          integration._environmentId === session.environment._id
      );

      expect(smsIntegration, 'Expected active Twilio integration fixture').to.exist;
      expect(smsIntegration.credentials).to.exist;
      expect(smsIntegration.credentials.accountSid).to.equal('AC123');
      expect(smsIntegration.credentials.token).to.equal('123');
    });
  });

  describe('POST /v1/integrations', () => {
    it('should not return credentials when created via API key auth', async () => {
      await integrationRepository.deleteMany({
        _organizationId: session.organization._id,
        _environmentId: session.environment._id,
        providerId: EmailProviderIdEnum.SendGrid,
      });

      const payload = {
        providerId: EmailProviderIdEnum.SendGrid,
        channel: ChannelTypeEnum.EMAIL,
        credentials: { apiKey: 'SG.api-key-create', secretKey: 'secret-create' },
        active: false,
        check: false,
      };

      const { body } = await session.testAgent
        .post('/v1/integrations')
        .set('authorization', `ApiKey ${session.apiKey}`)
        .send(payload);

      expect(body.data).to.exist;
      expect(body.data).to.not.have.property('credentials');

      const stored = await integrationRepository.findOne({
        _id: body.data._id,
        _environmentId: session.environment._id,
      });
      expect(stored, 'Integration should still be persisted').to.exist;
    });

    it('should still return decrypted credentials when created via session token', async () => {
      await integrationRepository.deleteMany({
        _organizationId: session.organization._id,
        _environmentId: session.environment._id,
        providerId: EmailProviderIdEnum.SendGrid,
      });

      const payload = {
        providerId: EmailProviderIdEnum.SendGrid,
        channel: ChannelTypeEnum.EMAIL,
        credentials: { apiKey: 'SG.api-key-jwt', secretKey: 'secret-jwt' },
        active: false,
        check: false,
      };

      const { body } = await session.testAgent.post('/v1/integrations').send(payload);

      expect(body.data.credentials).to.exist;
      expect(body.data.credentials.apiKey).to.equal(payload.credentials.apiKey);
      expect(body.data.credentials.secretKey).to.equal(payload.credentials.secretKey);
    });
  });

  describe('PUT /v1/integrations/:integrationId', () => {
    it('should not return credentials when updated via API key auth', async () => {
      const { body: listBody } = await session.testAgent.get('/v1/integrations');
      const target = listBody.data.find(
        (integration) =>
          integration.providerId === EmailProviderIdEnum.SendGrid &&
          integration._environmentId === session.environment._id
      );
      expect(target, 'Expected SendGrid integration fixture').to.exist;

      const payload = {
        credentials: { apiKey: 'SG.api-key-update', secretKey: 'secret-update' },
        active: true,
        check: false,
      };

      const { body } = await session.testAgent
        .put(`/v1/integrations/${target._id}`)
        .set('authorization', `ApiKey ${session.apiKey}`)
        .send(payload);

      expect(body.data).to.exist;
      expect(body.data._id).to.equal(target._id);
      expect(body.data).to.not.have.property('credentials');
    });

    it('should still return decrypted credentials when updated via session token', async () => {
      const { body: listBody } = await session.testAgent.get('/v1/integrations');
      const target = listBody.data.find(
        (integration) =>
          integration.providerId === EmailProviderIdEnum.SendGrid &&
          integration._environmentId === session.environment._id
      );
      expect(target, 'Expected SendGrid integration fixture').to.exist;

      const payload = {
        credentials: { apiKey: 'SG.api-key-update-jwt', secretKey: 'secret-update-jwt' },
        active: true,
        check: false,
      };

      const { body } = await session.testAgent.put(`/v1/integrations/${target._id}`).send(payload);

      expect(body.data.credentials).to.exist;
      expect(body.data.credentials.apiKey).to.equal(payload.credentials.apiKey);
      expect(body.data.credentials.secretKey).to.equal(payload.credentials.secretKey);
    });
  });

  describe('POST /v1/integrations/:integrationId/set-primary', () => {
    it('should not return credentials when called via API key auth', async () => {
      const { body: listBody } = await session.testAgent.get('/v1/integrations');
      const target = listBody.data.find(
        (integration) =>
          integration.providerId === EmailProviderIdEnum.SendGrid &&
          integration._environmentId === session.environment._id
      );
      expect(target, 'Expected SendGrid integration fixture').to.exist;

      const { body } = await session.testAgent
        .post(`/v1/integrations/${target._id}/set-primary`)
        .set('authorization', `ApiKey ${session.apiKey}`)
        .send({});

      expect(body.data).to.exist;
      expect(body.data._id).to.equal(target._id);
      expect(body.data.primary).to.equal(true);
      expect(body.data).to.not.have.property('credentials');
    });

    it('should still return decrypted credentials when called via session token', async () => {
      const { body: listBody } = await session.testAgent.get('/v1/integrations');
      const target = listBody.data.find(
        (integration) =>
          integration.providerId === EmailProviderIdEnum.SendGrid &&
          integration._environmentId === session.environment._id
      );
      expect(target, 'Expected SendGrid integration fixture').to.exist;

      const { body } = await session.testAgent.post(`/v1/integrations/${target._id}/set-primary`).send({});

      expect(body.data.credentials).to.exist;
      expect(body.data.credentials.apiKey).to.equal('SG.123');
      expect(body.data.credentials.secretKey).to.equal('abc');
      expect(body.data.primary).to.equal(true);
    });
  });

  describe('inbound webhook signing key', () => {
    const storedKey = 'whsec_stored';

    async function findSendGrid() {
      const integration = await integrationRepository.findOne({
        _organizationId: session.organization._id,
        _environmentId: session.environment._id,
        providerId: EmailProviderIdEnum.SendGrid,
      });
      expect(integration, 'Expected SendGrid integration fixture').to.exist;

      return integration!;
    }

    beforeEach(async () => {
      const sendgrid = await findSendGrid();
      await integrationRepository.update(
        { _id: sendgrid._id, _environmentId: session.environment._id },
        { $set: { configurations: { inboundWebhookEnabled: true, inboundWebhookSigningKey: storedKey } } }
      );
    });

    it('should not return the signing key to API-key callers', async () => {
      const sendgrid = await findSendGrid();
      const { body } = await session.testAgent.get('/v1/integrations').set('authorization', `ApiKey ${session.apiKey}`);

      const listed = body.data.find((integration) => integration._id === sendgrid._id);
      expect(listed.configurations.inboundWebhookEnabled).to.equal(true);
      expect(listed.configurations).to.not.have.property('inboundWebhookSigningKey');
    });

    it('should still return the signing key to session tokens', async () => {
      const sendgrid = await findSendGrid();
      const { body } = await session.testAgent.get('/v1/integrations');

      const listed = body.data.find((integration) => integration._id === sendgrid._id);
      expect(listed.configurations.inboundWebhookSigningKey).to.equal(storedKey);
    });

    it('should keep the stored signing key when an update leaves it out', async () => {
      const sendgrid = await findSendGrid();
      const { body } = await session.testAgent
        .put(`/v1/integrations/${sendgrid._id}`)
        .set('authorization', `ApiKey ${session.apiKey}`)
        .send({ configurations: { inboundWebhookEnabled: false }, check: false });

      expect(body.data.configurations).to.not.have.property('inboundWebhookSigningKey');
      const stored = await findSendGrid();
      expect(stored.configurations?.inboundWebhookEnabled).to.equal(false);
      expect(stored.configurations?.inboundWebhookSigningKey).to.equal(storedKey);
    });

    it('should replace the stored signing key when an update sends one', async () => {
      const sendgrid = await findSendGrid();
      await session.testAgent
        .put(`/v1/integrations/${sendgrid._id}`)
        .send({ configurations: { inboundWebhookEnabled: true, inboundWebhookSigningKey: '' }, check: false });

      const stored = await findSendGrid();
      expect(stored.configurations?.inboundWebhookSigningKey).to.equal('');
    });
  });

  describe('DELETE /v1/integrations/:integrationId', () => {
    const storedKey = 'whsec_stored_on_remaining';
    let sendgridId: string;
    let spareId: string;

    beforeEach(async () => {
      const sendgrid = await integrationRepository.findOne({
        _organizationId: session.organization._id,
        _environmentId: session.environment._id,
        providerId: EmailProviderIdEnum.SendGrid,
      });
      expect(sendgrid, 'Expected SendGrid integration fixture').to.exist;
      sendgridId = sendgrid!._id;
      await integrationRepository.update(
        { _id: sendgridId, _environmentId: session.environment._id },
        { $set: { configurations: { inboundWebhookEnabled: true, inboundWebhookSigningKey: storedKey } } }
      );

      // The delete answers with the integrations left in the environment, so delete a spare one.
      const { body, status } = await session.testAgent.post('/v1/integrations').send({
        providerId: EmailProviderIdEnum.Mailgun,
        channel: ChannelTypeEnum.EMAIL,
        credentials: { apiKey: 'key-spare', domain: 'spare.example.com' },
        active: false,
        check: false,
      });
      expect(status, 'Expected the spare integration to be created').to.equal(201);
      spareId = body.data._id;
    });

    function expectRemainingWithoutSecrets(
      remaining: Array<{ _id: string; credentials: unknown; configurations?: Record<string, unknown> }>
    ) {
      expect(remaining.length).to.be.greaterThan(0);
      expect(remaining.map((integration) => integration._id)).to.not.include(spareId);
      for (const integration of remaining) {
        expect(integration.credentials).to.deep.equal({});
        expect(integration.configurations ?? {}).to.not.have.property('inboundWebhookSigningKey');
      }
      const sendgrid = remaining.find((integration) => integration._id === sendgridId);
      expect(sendgrid?.configurations?.inboundWebhookEnabled).to.equal(true);
    }

    it('should return neither credentials nor signing keys to API-key callers', async () => {
      const { body, status } = await session.testAgent
        .delete(`/v1/integrations/${spareId}`)
        .set('authorization', `ApiKey ${session.apiKey}`);

      expect(status).to.equal(200);
      expectRemainingWithoutSecrets(body.data);
    });

    it('should return neither credentials nor signing keys to session tokens either', async () => {
      const { body, status } = await session.testAgent.delete(`/v1/integrations/${spareId}`);

      expect(status).to.equal(200);
      expectRemainingWithoutSecrets(body.data);
    });
  });

  describe('POST /v1/integrations/:integrationId/auto-configure', () => {
    const generatedKey = 'whsec_auto_configured';
    let getHandlerStub: sinon.SinonStub;

    beforeEach(() => {
      getHandlerStub = sinon.stub(ChannelFactory.prototype, 'getHandler').returns({
        autoConfigureInboundWebhook: async () => ({
          success: true,
          message: 'configured',
          configurations: { inboundWebhookEnabled: true, inboundWebhookSigningKey: generatedKey },
        }),
      } as unknown as ReturnType<ChannelFactory['getHandler']>);
    });

    afterEach(() => {
      getHandlerStub.restore();
    });

    async function autoConfigureSendGrid(authorization?: string) {
      const sendgrid = await integrationRepository.findOne({
        _organizationId: session.organization._id,
        _environmentId: session.environment._id,
        providerId: EmailProviderIdEnum.SendGrid,
      });
      expect(sendgrid, 'Expected SendGrid integration fixture').to.exist;

      const request = session.testAgent.post(`/v1/integrations/${sendgrid!._id}/auto-configure`);
      const { body } = await (authorization ? request.set('authorization', authorization) : request).send();

      return { body, sendgrid: sendgrid! };
    }

    it('should return neither credentials nor the signing key to API-key callers', async () => {
      const { body, sendgrid } = await autoConfigureSendGrid(`ApiKey ${session.apiKey}`);

      expect(body.data.success).to.equal(true);
      expect(body.data.integration.credentials).to.deep.equal({});
      expect(body.data.integration.configurations.inboundWebhookEnabled).to.equal(true);
      expect(body.data.integration.configurations).to.not.have.property('inboundWebhookSigningKey');
      expect(body.data.webhookUrl).to.contain(
        `/v2/inbound-webhooks/delivery-providers/${session.environment._id}/${sendgrid._id}`
      );

      const stored = await integrationRepository.findOne({
        _id: sendgrid._id,
        _environmentId: session.environment._id,
      });
      expect(stored?.configurations?.inboundWebhookSigningKey).to.equal(generatedKey);
    });

    it('should still return decrypted credentials and the signing key to session tokens', async () => {
      const { body } = await autoConfigureSendGrid();

      expect(body.data.integration.credentials.apiKey).to.equal('SG.123');
      expect(body.data.integration.configurations.inboundWebhookSigningKey).to.equal(generatedKey);
    });
  });
});
