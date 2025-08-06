import { Novu } from '@novu/api';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Get Subscriber - /subscribers/:id (GET) #novu-v2', () => {
  let session: UserSession;
  let novuClient: Novu;
  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    novuClient = initNovuClassSdk(session);
  });

  const subscriberId = 'sub_42';
  it('should return a subscriber by id', async () => {
    const createResponse = await novuClient.subscribers.create({
      subscriberId,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@doe.com',
    });

    const response = await novuClient.subscribers.retrieve(subscriberId);

    const subscriber = response.result;
    expect(subscriber.subscriberId).to.equal(subscriberId);
    expect(subscriber.topics).to.be.undefined;
  });
});
