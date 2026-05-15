import { IntegrationRepository } from '@novu/dal';
import { ChannelTypeEnum, EmailProviderIdEnum, SmsProviderIdEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';

/**
 * Regression coverage for GHSA-rgr9-mpmj-mpw8 / NV-7640:
 * An environment API key must never receive decrypted provider credentials
 * from the integrations endpoints, regardless of RBAC state.
 *
 * Session-token (JWT/dashboard) callers must keep receiving decrypted credentials
 * so dashboard flows continue to work.
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
      const { body } = await session.testAgent
        .get('/v1/integrations')
        .set('authorization', `ApiKey ${session.apiKey}`);

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
});
