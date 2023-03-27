import { SubscribersService, UserSession } from '@novu/testing';
import { expect } from 'chai';
import { sub } from 'date-fns';
import { SubscriberEntity } from '@novu/dal';

import { updateSubscriberOnlineFlag } from './helpers';

describe('Update Subscriber online flag - /subscribers/:subscriberId/online-status (PATCH)', function () {
  let session: UserSession;
  let onlineSubscriber: SubscriberEntity;
  let offlineSubscriber: SubscriberEntity;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    const subscribersService = new SubscribersService(session.organization._id, session.environment._id);
    onlineSubscriber = await subscribersService.createSubscriber({
      subscriberId: '123',
      isOnline: true,
    });
    offlineSubscriber = await subscribersService.createSubscriber({
      subscriberId: '456',
      isOnline: false,
      lastOnlineAt: sub(new Date(), { minutes: 1 }).toISOString(),
    });
  });

  it('should set the online status to false', async function () {
    const body = {
      isOnline: false,
    };

    const { data } = await updateSubscriberOnlineFlag(body, session, onlineSubscriber.subscriberId);

    expect(data.data.isOnline).to.equal(false);
    expect(data.data.lastOnlineAt).to.be.a('string');
  });

  it('should set the online status to true', async function () {
    const body = {
      isOnline: true,
    };

    const { data } = await updateSubscriberOnlineFlag(body, session, offlineSubscriber.subscriberId);

    expect(data.data.isOnline).to.equal(true);
  });
});
