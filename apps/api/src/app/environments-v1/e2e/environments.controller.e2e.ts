import { NOVU_ENCRYPTION_SUB_MASK } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Get Environment API Keys - /environments/api-keys (GET) #novu-v2', async () => {
  let session: UserSession;
  let novuClient: Novu;
  before(async () => {
    session = new UserSession();
    await session.initialize({});
    novuClient = initNovuClassSdk(session);
  });

  it('should get environment api keys correctly', async () => {
    const { body } = await session.testAgent.get('/v1/environments/api-keys').send();
    novuClient.environments.expect(body.data[0].key).to.not.contains(NOVU_ENCRYPTION_SUB_MASK);
    expect(body.data[0]._userId).to.equal(session.user._id);
  });
});
