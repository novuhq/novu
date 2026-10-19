import { EnvironmentRepository, IntegrationRepository } from '@novu/dal';
import { ChannelTypeEnum, EmailProviderIdEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('Auto Configure Integration - /integrations/:integrationId/auto-configure (POST) #novu-v2', () => {
  let session: UserSession;
  const integrationRepository = new IntegrationRepository();
  const envRepository = new EnvironmentRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  describe('API key authentication is scoped to the key environment', () => {
    it('should forbid auto-configuring an integration that lives in a different environment when authenticated via API key', async () => {
      const prodEnv = await envRepository.findOne({ name: 'Production', _organizationId: session.organization._id });
      expect(prodEnv?._id, 'Expected Production environment fixture').to.exist;

      const otherEnvironmentIntegration = await integrationRepository.create({
        name: 'OtherEnvAutoConfigure',
        identifier: 'other-env-auto-configure-api-key',
        providerId: EmailProviderIdEnum.SendGrid,
        channel: ChannelTypeEnum.EMAIL,
        active: false,
        credentials: { apiKey: 'SG.test', secretKey: 'test' },
        _organizationId: session.organization._id,
        _environmentId: prodEnv!._id,
      });

      const { body } = await session.testAgent
        .post(`/v1/integrations/${otherEnvironmentIntegration._id}/auto-configure`)
        .set('authorization', `ApiKey ${session.apiKey}`)
        .send();

      expect(body.statusCode).to.equal(403);
      expect(body.message).to.contain('is scoped to a single environment');
    });

    it('should still allow JWT-authenticated requests to auto-configure integrations in another environment', async () => {
      const prodEnv = await envRepository.findOne({ name: 'Production', _organizationId: session.organization._id });
      expect(prodEnv?._id, 'Expected Production environment fixture').to.exist;

      const otherEnvironmentIntegration = await integrationRepository.create({
        name: 'OtherEnvAutoConfigureJwt',
        identifier: 'other-env-auto-configure-jwt',
        providerId: EmailProviderIdEnum.SendGrid,
        channel: ChannelTypeEnum.EMAIL,
        active: false,
        credentials: { apiKey: 'SG.test', secretKey: 'test' },
        _organizationId: session.organization._id,
        _environmentId: prodEnv!._id,
      });

      const res = await session.testAgent
        .post(`/v1/integrations/${otherEnvironmentIntegration._id}/auto-configure`)
        .send();

      expect(res.status).to.not.equal(403);
    });
  });
});
