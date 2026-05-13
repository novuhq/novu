import { ApiServiceLevelEnum, EnvironmentEnum, NOVU_ENCRYPTION_SUB_MASK } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';

/**
 * Regression coverage for NV-7641 (originally fixed in NV-2380 / PR #3640):
 * An environment-scoped API key must never receive decrypted API keys for any
 * environment, regardless of RBAC state. A Development API key calling
 * GET /v1/environments must not be able to recover the Production API key.
 *
 * Session-token (JWT/dashboard) callers must keep receiving decrypted API keys
 * for every environment in the organization so the env switcher continues to work.
 */
describe('Environment API keys exposure to API-key auth - /environments #novu-v2', () => {
  let session: UserSession;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  describe('GET /v1/environments', () => {
    it('should return empty apiKeys for every environment when authenticated with an API key', async () => {
      const { body } = await session.testAgent.get('/v1/environments').set('authorization', `ApiKey ${session.apiKey}`);

      expect(body.data.length).to.be.greaterThanOrEqual(2);
      for (const environment of body.data) {
        expect(environment.apiKeys).to.be.an('array');
        expect(environment.apiKeys).to.have.lengthOf(0);
      }
    });

    it('should not allow a Development API key to retrieve the Production API key', async () => {
      const { body } = await session.testAgent.get('/v1/environments').set('authorization', `ApiKey ${session.apiKey}`);

      const productionEnvironment = body.data.find(
        (environment: { name: string }) => environment.name === EnvironmentEnum.PRODUCTION
      );

      expect(productionEnvironment, 'Expected Production environment fixture').to.exist;
      expect(productionEnvironment.apiKeys).to.be.an('array').that.has.lengthOf(0);
    });

    it('should still return decrypted apiKeys for every environment when authenticated via session token', async () => {
      const { body } = await session.testAgent.get('/v1/environments');

      expect(body.data.length).to.be.greaterThanOrEqual(2);
      for (const environment of body.data) {
        expect(environment._organizationId).to.equal(session.organization._id);
        expect(environment.apiKeys.length).to.be.greaterThanOrEqual(1);
        expect(environment.apiKeys[0].key).to.not.contain(NOVU_ENCRYPTION_SUB_MASK);
        expect(environment.apiKeys[0]._userId).to.equal(session.user._id);
      }
    });
  });

  describe('POST /v1/environments', () => {
    it('should not return apiKeys when an environment is created via API key auth', async () => {
      await session.updateOrganizationServiceLevel(ApiServiceLevelEnum.BUSINESS);

      const payload = {
        name: `env-apikey-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        parentId: session.environment._id,
        color: '#b15353',
      };

      const { body } = await session.testAgent
        .post('/v1/environments')
        .set('authorization', `ApiKey ${session.apiKey}`)
        .send(payload);

      expect(body.data).to.exist;
      expect(body.data.name).to.equal(payload.name);
      expect(body.data.apiKeys ?? [])
        .to.be.an('array')
        .that.has.lengthOf(0);
    });

    it('should still return decrypted apiKeys when an environment is created via session token', async () => {
      await session.updateOrganizationServiceLevel(ApiServiceLevelEnum.BUSINESS);

      const payload = {
        name: `env-jwt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        parentId: session.environment._id,
        color: '#b15353',
      };

      const { body } = await session.testAgent.post('/v1/environments').send(payload);

      expect(body.data).to.exist;
      expect(body.data.name).to.equal(payload.name);
      expect(body.data.apiKeys).to.be.an('array').that.has.lengthOf(1);
      expect(body.data.apiKeys[0].key).to.not.contain(NOVU_ENCRYPTION_SUB_MASK);
    });
  });
});
