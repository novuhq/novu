import { Novu } from '@novu/api';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe.only('Update topic by key - /v2/topics/:topicKey (PATCH) #novu-v2', async () => {
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
    const createResponse = await novuClient.topics.create({
      key: topicKey,
      name: initialName,
    });
    topicId = createResponse.result.id;
  });

  it('should update a topic by its key', async () => {
    const updatedName = 'Updated Topic Name';
    const response = await novuClient.topics.update(
      {
        name: updatedName,
      },
      topicKey
    );

    expect(response.result).to.exist;
    expect(response.result.id).to.equal(topicId);
    expect(response.result.key).to.equal(topicKey);
    expect(response.result.name).to.equal(updatedName);
    expect(response.result).to.have.property('createdAt');
    expect(response.result).to.have.property('updatedAt');

    // Verify the update persisted by fetching the topic
    const getResponse = await novuClient.topics.get(topicKey);
    expect(getResponse.result).to.exist;
    expect(getResponse.result.name).to.equal(updatedName);
  });

  it('should return 404 for updating a non-existent topic key', async () => {
    const nonExistentKey = 'non-existent-topic-key';
    try {
      await novuClient.topics.update(
        {
          name: 'New Name',
        },
        nonExistentKey
      );

      /* If we reach here, the test failed */
      expect.fail('Should have thrown an error for non-existent topic');
    } catch (error) {
      expect(error.response?.status || error.status).to.equal(404);
      expect(error.response?.data?.message || error.message).to.include(nonExistentKey);
    }
  });

  it('should validate required fields', async () => {
    try {
      /* Missing name */
      /* @ts-expect-error - Testing invalid input */
      await novuClient.topics.update({}, topicKey);

      /* If we reach here, the test failed */
      expect.fail('Should have thrown an error for missing name');
    } catch (error) {
      expect(error.response?.status || error.status).to.equal(400);
    }
  });
});
