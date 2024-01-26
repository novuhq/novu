import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { NOVU_ENCRYPTION_SUB_MASK } from '@novu/shared';

describe('Get Environment API Keys - /environments/api-keys (GET)', async () => {
  let session: UserSession;
  before(async () => {
    session = new UserSession();
    await session.initialize({});
  });

  it('should get environment api keys correctly', async () => {
    const demoEnvironment = {
      name: 'Hello App',
    };
    await session.testAgent.post('/v1/environments').send(demoEnvironment).expect(201);

    const { body } = await session.testAgent.get('/v1/environments/api-keys').send();

    expect(body.data[0].key).to.not.contains(NOVU_ENCRYPTION_SUB_MASK);
    expect(body.data[0]._userId).to.equal(session.user._id);
  });
});
