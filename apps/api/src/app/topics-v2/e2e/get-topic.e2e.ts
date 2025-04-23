import { Novu } from '@novu/api';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Get topic by key - /v2/topics/:topicKey (GET) #novu-v2', async () => {
  let session: UserSession;
  let novuClient: Novu;
  const topicKey = `topic-key-${Date.now()}`;
  const topicName = 'Test Topic Name';

  before(async () => {
    session = new UserSession();
    await session.initialize();
    novuClient = initNovuClassSdk(session);

    // Create a topic to retrieve later
    await session.testAgent.post('/v2/topics').send({
      key: topicKey,
      name: topicName,
    });
  });

  it('should retrieve a topic by its key', async () => {
    const response = await session.testAgent.get(`/v2/topics/${topicKey}`);

    expect(response.statusCode).to.equal(200);
    expect(response.body).to.have.property('_id');
    expect(response.body.key).to.equal(topicKey);
    expect(response.body.name).to.equal(topicName);
    expect(response.body).to.have.property('createdAt');
    expect(response.body).to.have.property('updatedAt');
  });

  it('should return 404 for a non-existent topic key', async () => {
    const nonExistentKey = 'non-existent-topic-key';
    const response = await session.testAgent.get(`/v2/topics/${nonExistentKey}`);

    expect(response.statusCode).to.equal(404);
    expect(response.body.message).to.include(nonExistentKey);
  });
});
