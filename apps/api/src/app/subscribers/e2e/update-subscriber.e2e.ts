import { UserSession } from '@novu/testing';
import { SubscriberRepository } from '@novu/dal';
import { expect } from 'chai';
import axios from 'axios';

const axiosInstance = axios.create();

describe('Update Subscriber - /subscribers/:subscriberId (PUT)', function () {
  let session: UserSession;
  const subscriberRepository = new SubscriberRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should update an existing subscriber', async function () {
    await axiosInstance.post(
      `${session.serverUrl}/v1/subscribers`,
      {
        subscriberId: '123',
        firstName: 'John',
        lastName: 'Doe',
      },
      {
        headers: {
          authorization: `ApiKey ${session.apiKey}`,
        },
      }
    );

    const response = await axiosInstance.put(
      `${session.serverUrl}/v1/subscribers/123`,
      {
        lastName: 'Test Changed',
      },
      {
        headers: {
          authorization: `ApiKey ${session.apiKey}`,
        },
      }
    );

    const { data: body } = response;

    expect(body.data).to.be.ok;
    const createdSubscriber = await subscriberRepository.findBySubscriberId(session.application._id, '123');

    expect(createdSubscriber.firstName).to.equal('John');
    expect(createdSubscriber.lastName).to.equal('Test Changed');
  });
});
