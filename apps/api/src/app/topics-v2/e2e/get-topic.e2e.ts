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
    await novuClient.topics.create({
      key: topicKey,
      name: topicName,
    });
  });

  it('should retrieve a topic by its key', async () => {
    const response = await novuClient.topics.get(topicKey);

    expect(response).to.exist;
    expect(response.result).to.have.property('id');
    expect(response.result.key).to.equal(topicKey);
    expect(response.result.name).to.equal(topicName);
    expect(response.result).to.have.property('createdAt');
    expect(response.result).to.have.property('updatedAt');
  });

  it('should return 404 for a non-existent topic key', async () => {
    const nonExistentKey = 'non-existent-topic-key';
    try {
      await novuClient.topics.get(nonExistentKey);
      throw new Error('Should have failed to get non-existent topic');
    } catch (error) {
      expect(error.statusCode).to.equal(404);
      expect(error.message).to.include(nonExistentKey);
    }
  });
});
