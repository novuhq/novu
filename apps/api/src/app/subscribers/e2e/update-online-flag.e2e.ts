import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import axios from 'axios';
import { sub } from 'date-fns';
import { SubscriberEntity } from '@novu/dal';

import { UpdateSubscriberOnlineFlagRequestDto } from '../../subscribers/dtos/update-subscriber-online-flag-request.dto';

const axiosInstance = axios.create();

describe('Update Subscriber online flag - /subscribers/:subscriberId/online-status (PATCH)', function () {
  let session: UserSession;
  let onlineSubscriber: SubscriberEntity;
  let offlineSubscriber: SubscriberEntity;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    onlineSubscriber = await session.createSubscriber({
      subscriberId: '123',
      isOnline: true,
    });
    offlineSubscriber = await session.createSubscriber({
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

async function updateSubscriberOnlineFlag(
  data: UpdateSubscriberOnlineFlagRequestDto,
  session: UserSession,
  subscriberId: string
) {
  return await axiosInstance.patch(`${session.serverUrl}/v1/subscribers/${subscriberId}/online-status`, data, {
    headers: {
      authorization: `ApiKey ${session.apiKey}`,
    },
  });
}
