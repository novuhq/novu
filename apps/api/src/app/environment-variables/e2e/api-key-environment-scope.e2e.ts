import { EnvironmentRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('Environment Variables API key environment scope - /environment-variables #novu-v2', () => {
  let session: UserSession;
  let devEnvironmentId: string;
  let prodEnvironmentId: string;
  const environmentRepository = new EnvironmentRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();

    devEnvironmentId = session.environment._id;
    const prod = await environmentRepository.findOne({
      _parentId: session.environment._id,
      _organizationId: session.organization._id,
    });

    if (!prod) {
      throw new Error('Production environment not found for test session');
    }

    prodEnvironmentId = prod._id;
  });

  describe('API key authentication is scoped to the key environment', () => {
    it('should forbid creating variables for a different environment via API key', async () => {
      const { body } = await session.testAgent
        .post('/v1/environment-variables')
        .set('authorization', `ApiKey ${session.apiKey}`)
        .send({
          key: 'CROSS_ENV_CREATE',
          values: [{ _environmentId: prodEnvironmentId, value: 'prod-only-value' }],
        });

      expect(body.statusCode).to.equal(403);
      expect(body.message).to.contain('is scoped to a single environment');
    });

    it('should allow creating variables for the API key environment via API key', async () => {
      const {
        body: { data },
      } = await session.testAgent
        .post('/v1/environment-variables')
        .set('authorization', `ApiKey ${session.apiKey}`)
        .send({
          key: 'SAME_ENV_CREATE',
          values: [{ _environmentId: devEnvironmentId, value: 'dev-value' }],
        });

      expect(data.key).to.equal('SAME_ENV_CREATE');
      expect(data.values).to.have.length(1);
      expect(data.values[0]._environmentId).to.equal(devEnvironmentId);
    });

    it('should forbid updating variables for a different environment via API key', async () => {
      const {
        body: { data: created },
      } = await session.testAgent.post('/v1/environment-variables').send({
        key: 'CROSS_ENV_UPDATE',
        values: [
          { _environmentId: devEnvironmentId, value: 'dev-value' },
          { _environmentId: prodEnvironmentId, value: 'prod-value' },
        ],
      });

      expect(created.key).to.equal('CROSS_ENV_UPDATE');

      const { body } = await session.testAgent
        .patch('/v1/environment-variables/CROSS_ENV_UPDATE')
        .set('authorization', `ApiKey ${session.apiKey}`)
        .send({
          values: [{ _environmentId: prodEnvironmentId, value: 'hijacked-prod-value' }],
        });

      expect(body.statusCode).to.equal(403);
      expect(body.message).to.contain('is scoped to a single environment');
    });

    it('should allow bearer auth to update variables across environments in the same org', async () => {
      const {
        body: { data: created },
      } = await session.testAgent.post('/v1/environment-variables').send({
        key: 'BEARER_CROSS_ENV_UPDATE',
        values: [
          { _environmentId: devEnvironmentId, value: 'dev-value' },
          { _environmentId: prodEnvironmentId, value: 'prod-value' },
        ],
      });

      expect(created.key).to.equal('BEARER_CROSS_ENV_UPDATE');

      const {
        body: { data: updated },
      } = await session.testAgent.patch('/v1/environment-variables/BEARER_CROSS_ENV_UPDATE').send({
        values: [{ _environmentId: prodEnvironmentId, value: 'updated-prod-value' }],
      });

      expect(updated.values).to.have.length(2);
      expect(updated.values.some((value: { _environmentId: string }) => value._environmentId === prodEnvironmentId)).to
        .be.true;
    });
  });
});
