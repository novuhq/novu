import { NOVU_ENCRYPTION_SUB_MASK } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';

const mutableEnv = process.env as Record<string, string | undefined>;
mutableEnv.LAUNCH_DARKLY_SDK_KEY = ''; // disable Launch Darkly to allow test to define FF state

describe('Manage Environment API Keys - /environments/api-keys (POST/DELETE) #novu-v2', () => {
  let session: UserSession;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    mutableEnv.IS_MULTIPLE_SECRET_KEYS_ALLOWED = 'true';
  });

  afterEach(() => {
    delete mutableEnv.IS_MULTIPLE_SECRET_KEYS_ALLOWED;
  });

  it('should create an additional api key', async () => {
    const { body, status } = await session.testAgent.post('/v1/environments/api-keys').send();

    expect(status).to.equal(201);
    expect(body.data.length).to.equal(2);
    expect(body.data[0].key).to.not.equal(body.data[1].key);

    for (const apiKey of body.data) {
      expect(apiKey.key).to.not.contains(NOVU_ENCRYPTION_SUB_MASK);
      expect(apiKey.hash).to.be.a('string');
      expect(apiKey._userId).to.equal(session.user._id);
    }
  });

  it('should keep the original key first and append the new key', async () => {
    const {
      body: { data: originalKeys },
    } = await session.testAgent.get('/v1/environments/api-keys').send();

    const { body } = await session.testAgent.post('/v1/environments/api-keys').send();

    expect(body.data[0].key).to.equal(originalKeys[0].key);
    expect(body.data[1].key).to.not.equal(originalKeys[0].key);
  });

  it('should reject creating a third api key', async () => {
    await session.testAgent.post('/v1/environments/api-keys').send().expect(201);

    const { body, status } = await session.testAgent.post('/v1/environments/api-keys').send();

    expect(status).to.equal(400);
    expect(body.message).to.contain('maximum');
  });

  it('should authenticate with both keys during rotation', async () => {
    const { body } = await session.testAgent.post('/v1/environments/api-keys').send();
    const [oldKey, newKey] = body.data;

    for (const apiKey of [oldKey, newKey]) {
      const { status } = await session.testAgent
        .get('/v1/environments/me')
        .set('authorization', `ApiKey ${apiKey.key}`)
        .send();

      expect(status).to.equal(200);
    }
  });

  it('should delete a specific api key and invalidate it', async () => {
    const {
      body: { data: keysAfterCreate },
    } = await session.testAgent.post('/v1/environments/api-keys').send();
    const [oldKey, newKey] = keysAfterCreate;

    const { body, status } = await session.testAgent.delete(`/v1/environments/api-keys/${oldKey.hash}`).send();

    expect(status).to.equal(200);
    expect(body.data.length).to.equal(1);
    expect(body.data[0].key).to.equal(newKey.key);

    const { status: deletedKeyAuthStatus } = await session.testAgent
      .get('/v1/environments/me')
      .set('authorization', `ApiKey ${oldKey.key}`)
      .send();

    expect(deletedKeyAuthStatus).to.equal(401);

    const { status: remainingKeyAuthStatus } = await session.testAgent
      .get('/v1/environments/me')
      .set('authorization', `ApiKey ${newKey.key}`)
      .send();

    expect(remainingKeyAuthStatus).to.equal(200);
  });

  it('should never exceed the key cap under concurrent create requests', async () => {
    const [first, second] = await Promise.all([
      session.testAgent.post('/v1/environments/api-keys').send(),
      session.testAgent.post('/v1/environments/api-keys').send(),
    ]);

    const statuses = [first.status, second.status].sort();
    expect(statuses).to.deep.equal([201, 400]);

    const {
      body: { data: keys },
    } = await session.testAgent.get('/v1/environments/api-keys').send();

    expect(keys.length).to.equal(2);
  });

  it('should never delete all keys under concurrent delete requests', async () => {
    const {
      body: { data: keysAfterCreate },
    } = await session.testAgent.post('/v1/environments/api-keys').send();
    const [firstKey, secondKey] = keysAfterCreate;

    const [first, second] = await Promise.all([
      session.testAgent.delete(`/v1/environments/api-keys/${firstKey.hash}`).send(),
      session.testAgent.delete(`/v1/environments/api-keys/${secondKey.hash}`).send(),
    ]);

    const statuses = [first.status, second.status].sort();
    expect(statuses).to.deep.equal([200, 400]);

    const {
      body: { data: remainingKeys },
    } = await session.testAgent.get('/v1/environments/api-keys').send();

    expect(remainingKeys.length).to.equal(1);
  });

  it('should not delete the last remaining api key', async () => {
    const {
      body: { data: keys },
    } = await session.testAgent.get('/v1/environments/api-keys').send();

    const { body, status } = await session.testAgent.delete(`/v1/environments/api-keys/${keys[0].hash}`).send();

    expect(status).to.equal(400);
    expect(body.message).to.contain('last remaining');
  });

  it('should return 404 when deleting an unknown api key', async () => {
    await session.testAgent.post('/v1/environments/api-keys').send().expect(201);

    const unknownHash = 'a'.repeat(64);
    const { status } = await session.testAgent.delete(`/v1/environments/api-keys/${unknownHash}`).send();

    expect(status).to.equal(404);
  });

  it('should reject create and delete when the feature flag is disabled', async () => {
    const {
      body: { data: keys },
    } = await session.testAgent.get('/v1/environments/api-keys').send();

    delete mutableEnv.IS_MULTIPLE_SECRET_KEYS_ALLOWED;

    const { status: createStatus } = await session.testAgent.post('/v1/environments/api-keys').send();
    expect(createStatus).to.equal(403);

    const { status: deleteStatus } = await session.testAgent.delete(`/v1/environments/api-keys/${keys[0].hash}`).send();
    expect(deleteStatus).to.equal(403);
  });

  it('should collapse to a single key on regenerate', async () => {
    await session.testAgent.post('/v1/environments/api-keys').send().expect(201);

    const { body } = await session.testAgent.post('/v1/environments/api-keys/regenerate').send();

    expect(body.data.length).to.equal(1);
  });

  it('should return the hash for each api key on list', async () => {
    const { body } = await session.testAgent.get('/v1/environments/api-keys').send();

    expect(body.data.length).to.equal(1);
    expect(body.data[0].hash).to.be.a('string');
    expect(body.data[0].hash).to.have.length(64);
  });
});
