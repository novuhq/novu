import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { NOVU_ENCRYPTION_SUB_MASK } from '@novu/shared';

describe('Environment - Regenerate Api Key', async () => {
  let session: UserSession;

  before(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should regenerate an Api Key', async () => {
    const {
      body: { data: oldApiKeys },
    } = await session.testAgent.get('/v1/environments/api-keys').send({});
    const oldApiKey = oldApiKeys[0].key;
    expect(oldApiKey).to.not.contains(NOVU_ENCRYPTION_SUB_MASK);

    const {
      body: { data: newApiKeys },
    } = await session.testAgent.post('/v1/environments/api-keys/regenerate').send({});
    const newApiKey = newApiKeys[0].key;
    expect(newApiKey).to.not.contains(NOVU_ENCRYPTION_SUB_MASK);

    expect(oldApiKey).to.not.equal(newApiKey);

    const {
      body: { data: organizations },
    } = await session.testAgent.get('/v1/organizations').send({});

    expect(organizations).not.to.be.empty;
  });
});
