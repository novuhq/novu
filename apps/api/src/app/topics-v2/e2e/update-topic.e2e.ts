import { Novu } from '@novu/api';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Update topic by key - /v2/topics/:topicKey (PATCH) #novu-v2', async () => {
  let session: UserSession;
  let novuClient: Novu;
  const topicKey = `topic-key-${Date.now()}`;
  const initialName = 'Initial Topic Name';
  let topicId: string;

  before(async () => {
    session = new UserSession();
    await session.initialize();
    novuClient = initNovuClassSdk(session);

    // Create a topic to update later
    const createResponse = await session.testAgent.post('/v2/topics').send({
      key: topicKey,
      name: initialName,
    });
    topicId = createResponse.body._id;
  });

  it('should update a topic by its key', async () => {
    const updatedName = 'Updated Topic Name';
    const response = await session.testAgent.patch(`/v2/topics/${topicKey}`).send({
      name: updatedName,
    });

    expect(response.statusCode).to.equal(200);
    expect(response.body._id).to.equal(topicId);
    expect(response.body.key).to.equal(topicKey);
    expect(response.body.name).to.equal(updatedName);
    expect(response.body).to.have.property('createdAt');
    expect(response.body).to.have.property('updatedAt');

    // Verify the update persisted by fetching the topic
    const getResponse = await session.testAgent.get(`/v2/topics/${topicKey}`);
    expect(getResponse.statusCode).to.equal(200);
    expect(getResponse.body.name).to.equal(updatedName);
  });

  it('should return 404 for updating a non-existent topic key', async () => {
    const nonExistentKey = 'non-existent-topic-key';
    const response = await session.testAgent.patch(`/v2/topics/${nonExistentKey}`).send({
      name: 'New Name',
    });

    expect(response.statusCode).to.equal(404);
    expect(response.body.message).to.include(nonExistentKey);
  });

  it('should validate required fields', async () => {
    // Missing name
    const response = await session.testAgent.patch(`/v2/topics/${topicKey}`).send({});

    expect(response.statusCode).to.equal(400);
  });
});
