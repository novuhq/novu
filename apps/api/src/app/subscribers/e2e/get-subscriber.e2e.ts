import { expect } from 'chai';
import { UserSession } from '@novu/testing';
import { Novu } from '@novu/api';
import { initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Get Subscriber - /subscribers/:id (GET) #novu-v2', function () {
  let session: UserSession;
  let novuClient: Novu;
  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    novuClient = initNovuClassSdk(session);
  });

  const subscriberId = 'sub_42';
  it('should return a subscriber by id', async function () {
    await novuClient.subscribers.create({
      subscriberId,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@doe.com',
      phone: '+5555555555',
    });

    const response = await novuClient.subscribers.retrieve(subscriberId);

    const subscriber = response.result;
    expect(subscriber.subscriberId).to.equal(subscriberId);
    expect(subscriber.topics).to.be.undefined;
  });

  it('should return a subscriber with their topics', async function () {
    await novuClient.subscribers.create({
      subscriberId,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@doe.com',
      phone: '+5555555555',
    });

    const topicKey = 'top_42';
    await novuClient.topics.create({
      key: topicKey,
      name: 'My Topic',
    });

    await novuClient.topics.subscribers.assign(
      {
        subscribers: [subscriberId],
      },
      topicKey
    );

    const response = await novuClient.subscribers.retrieveLegacy(subscriberId, true);

    const subscriber = response.result;
    expect(subscriber.subscriberId).to.equal(subscriberId);
    expect(subscriber.topics).to.eql([topicKey]);
  });
});
