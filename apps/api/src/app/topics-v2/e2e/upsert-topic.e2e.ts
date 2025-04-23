import { Novu } from '@novu/api';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Upsert topic - /v2/topics (POST) #novu-v2', async () => {
  let session: UserSession;
  let novuClient: Novu;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    novuClient = initNovuClassSdk(session);
  });

  it('should create a new topic when it does not exist', async () => {
    const key = `topic-key-${Date.now()}`;
    const name = 'Test Topic Name';

    const response = await session.testAgent.post('/v2/topics').send({
      key,
      name,
    });

    expect(response.statusCode).to.equal(201);
    expect(response.body).to.have.property('_id');
    expect(response.body.key).to.equal(key);
    expect(response.body.name).to.equal(name);
    expect(response.body).to.have.property('createdAt');
    expect(response.body).to.have.property('updatedAt');
  });

  it('should update an existing topic when it already exists', async () => {
    // First create a topic
    const key = `topic-key-${Date.now()}`;
    const originalName = 'Original Name';

    const createResponse = await session.testAgent.post('/v2/topics').send({
      key,
      name: originalName,
    });

    expect(createResponse.statusCode).to.equal(201);
    const originalId = createResponse.body._id;

    // Now update the same topic
    const updatedName = 'Updated Name';
    const updateResponse = await session.testAgent.post('/v2/topics').send({
      key,
      name: updatedName,
    });

    expect(updateResponse.statusCode).to.equal(201);
    expect(updateResponse.body._id).to.equal(originalId);
    expect(updateResponse.body.key).to.equal(key);
    expect(updateResponse.body.name).to.equal(updatedName);
  });

  it('should validate required fields', async () => {
    // Missing key
    const missingKeyResponse = await session.testAgent.post('/v2/topics').send({
      name: 'Test Topic',
    });

    expect(missingKeyResponse.statusCode).to.equal(400);

    // Missing name
    const missingNameResponse = await session.testAgent.post('/v2/topics').send({
      key: 'test-key',
    });

    expect(missingNameResponse.statusCode).to.equal(400);
  });
});
