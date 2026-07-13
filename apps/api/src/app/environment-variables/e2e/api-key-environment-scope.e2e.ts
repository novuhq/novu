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

    it('should forbid updating shared variable metadata without values via API key', async () => {
      const {
        body: { data: created },
      } = await session.testAgent.post('/v1/environment-variables').send({
        key: 'METADATA_SCOPE_TEST',
        values: [
          { _environmentId: devEnvironmentId, value: 'dev-value' },
          { _environmentId: prodEnvironmentId, value: 'prod-value' },
        ],
      });

      expect(created.key).to.equal('METADATA_SCOPE_TEST');

      const { body } = await session.testAgent
        .patch('/v1/environment-variables/METADATA_SCOPE_TEST')
        .set('authorization', `ApiKey ${session.apiKey}`)
        .send({
          key: 'RENAMED_BY_API_KEY',
        });

      expect(body.statusCode).to.equal(403);
      expect(body.message).to.contain('cannot update shared environment variable metadata');
    });

    it('should allow bearer auth to update shared variable metadata', async () => {
      const {
        body: { data: created },
      } = await session.testAgent.post('/v1/environment-variables').send({
        key: 'BEARER_METADATA_UPDATE',
        values: [{ _environmentId: devEnvironmentId, value: 'dev-value' }],
      });

      expect(created.key).to.equal('BEARER_METADATA_UPDATE');

      const {
        body: { data: updated },
      } = await session.testAgent.patch('/v1/environment-variables/BEARER_METADATA_UPDATE').send({
        key: 'BEARER_METADATA_RENAMED',
      });

      expect(updated.key).to.equal('BEARER_METADATA_RENAMED');
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

    it('should filter list values to the API key environment', async () => {
      await session.testAgent.post('/v1/environment-variables').send({
        key: 'CROSS_ENV_READ_LIST',
        values: [
          { _environmentId: devEnvironmentId, value: 'dev-value' },
          { _environmentId: prodEnvironmentId, value: 'prod-secret-ish' },
        ],
      });

      const {
        body: { data },
      } = await session.testAgent
        .get('/v1/environment-variables')
        .set('authorization', `ApiKey ${session.apiKey}`);

      const variable = data.find((item: { key: string }) => item.key === 'CROSS_ENV_READ_LIST');

      expect(variable).to.exist;
      expect(variable.values).to.have.length(1);
      expect(variable.values[0]._environmentId).to.equal(devEnvironmentId);
      expect(variable.values[0].value).to.equal('dev-value');
    });

    it('should filter retrieve values to the API key environment', async () => {
      await session.testAgent.post('/v1/environment-variables').send({
        key: 'CROSS_ENV_READ_ONE',
        values: [
          { _environmentId: devEnvironmentId, value: 'dev-value' },
          { _environmentId: prodEnvironmentId, value: 'prod-value' },
        ],
      });

      const {
        body: { data },
      } = await session.testAgent
        .get('/v1/environment-variables/CROSS_ENV_READ_ONE')
        .set('authorization', `ApiKey ${session.apiKey}`);

      expect(data.values).to.have.length(1);
      expect(data.values[0]._environmentId).to.equal(devEnvironmentId);
      expect(data.values[0].value).to.equal('dev-value');
    });

    it('should allow bearer auth to read values across environments', async () => {
      await session.testAgent.post('/v1/environment-variables').send({
        key: 'BEARER_CROSS_ENV_READ',
        values: [
          { _environmentId: devEnvironmentId, value: 'dev-value' },
          { _environmentId: prodEnvironmentId, value: 'prod-value' },
        ],
      });

      const {
        body: { data },
      } = await session.testAgent.get('/v1/environment-variables/BEARER_CROSS_ENV_READ');

      expect(data.values).to.have.length(2);
    });

    it('should delete only the API key environment value and preserve sibling values', async () => {
      await session.testAgent.post('/v1/environment-variables').send({
        key: 'CROSS_ENV_DELETE',
        values: [
          { _environmentId: devEnvironmentId, value: 'dev-value' },
          { _environmentId: prodEnvironmentId, value: 'prod-value' },
        ],
      });

      const deleteResponse = await session.testAgent
        .delete('/v1/environment-variables/CROSS_ENV_DELETE')
        .set('authorization', `ApiKey ${session.apiKey}`);

      expect(deleteResponse.status).to.equal(204);

      const {
        body: { data },
      } = await session.testAgent.get('/v1/environment-variables/CROSS_ENV_DELETE');

      expect(data.values).to.have.length(1);
      expect(data.values[0]._environmentId).to.equal(prodEnvironmentId);
      expect(data.values[0].value).to.equal('prod-value');
    });

    it('should fully remove the variable when API key deletes the last environment value', async () => {
      await session.testAgent.post('/v1/environment-variables').send({
        key: 'LAST_ENV_DELETE',
        values: [{ _environmentId: devEnvironmentId, value: 'dev-only-value' }],
      });

      const deleteResponse = await session.testAgent
        .delete('/v1/environment-variables/LAST_ENV_DELETE')
        .set('authorization', `ApiKey ${session.apiKey}`);

      expect(deleteResponse.status).to.equal(204);

      const { body } = await session.testAgent.get('/v1/environment-variables/LAST_ENV_DELETE');

      expect(body.statusCode).to.equal(404);
    });

    it('should allow bearer auth to delete the entire variable across environments', async () => {
      await session.testAgent.post('/v1/environment-variables').send({
        key: 'BEARER_FULL_DELETE',
        values: [
          { _environmentId: devEnvironmentId, value: 'dev-value' },
          { _environmentId: prodEnvironmentId, value: 'prod-value' },
        ],
      });

      const deleteResponse = await session.testAgent.delete('/v1/environment-variables/BEARER_FULL_DELETE');

      expect(deleteResponse.status).to.equal(204);

      const { body } = await session.testAgent.get('/v1/environment-variables/BEARER_FULL_DELETE');

      expect(body.statusCode).to.equal(404);
    });
  });
});
