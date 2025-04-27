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

    const response = await novuClient.topics.create({
      key,
      name,
    });

    expect(response.result).to.exist;
    expect(response.result).to.have.property('id');
    expect(response.result.key).to.equal(key);
    expect(response.result.name).to.equal(name);
    expect(response.result).to.have.property('createdAt');
    expect(response.result).to.have.property('updatedAt');
  });

  it('should update an existing topic when it already exists', async () => {
    // First create a topic
    const key = `topic-key-${Date.now()}`;
    const originalName = 'Original Name';

    const createResponse = await novuClient.topics.create({
      key,
      name: originalName,
    });

    expect(createResponse.result).to.exist;
    const originalId = createResponse.result.id;

    // Now update the same topic by creating with the same key
    const updatedName = 'Updated Name';
    const updateResponse = await novuClient.topics.update(
      {
        name: updatedName,
      },
      key
    );

    expect(updateResponse.result).to.exist;
    expect(updateResponse.result.id).to.equal(originalId);
    expect(updateResponse.result.key).to.equal(key);
    expect(updateResponse.result.name).to.equal(updatedName);
    // Verify the update persisted by fetching the topic
    const getResponse = await novuClient.topics.get(key);
    expect(getResponse.result.name).to.equal(updatedName);
  });
});
