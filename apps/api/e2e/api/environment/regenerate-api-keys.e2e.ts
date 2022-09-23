import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('Environment - Regenerate Api Key', async () => {
  let session: UserSession;

  before(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should regenerate an Api Key', async () => {
    const { body: oldApiKeys } = await session.testAgent.get<{ key: string }[]>('/v1/environment/api-keys');
    const oldApiKey = oldApiKeys[0].key;

    const { body: newApiKeys } = await session.testAgent.get<{ key: string }[]>('/v1/environment/api-keys/regenerate');
    const newApiKey = newApiKeys[0].key;

    expect(oldApiKey).to.not.equal(newApiKey);
  });
});
