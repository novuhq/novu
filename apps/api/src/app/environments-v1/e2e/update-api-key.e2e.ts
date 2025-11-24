import { NOVU_ENCRYPTION_SUB_MASK } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('Environment - Update Api Key #novu-v0-os', async () => {
  let session: UserSession;

  before(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should update an Api Key', async () => {
    const {
      body: { data: oldApiKeys },
    } = await session.testAgent.get('/v1/environments/api-keys').send({});
    const oldApiKey = oldApiKeys[0].key;
    expect(oldApiKey).to.not.contains(NOVU_ENCRYPTION_SUB_MASK);

    const newKey = 'my-new-api-key-123456-of-32chars';
    const {
      body: { data: newApiKeys },
    } = await session.testAgent.post('/v1/environments/api-keys/update').send({
      apiKey: newKey,
    });

    const newApiKey = newApiKeys[0].key;
    expect(newApiKey).to.equals(newKey);
  });
});
