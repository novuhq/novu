import { UserSession } from '@novu/testing';
import { SubscriberRepository } from '@novu/dal';
import { expect } from 'chai';
import axios from 'axios';

const axiosInstance = axios.create();

describe('Delete Subscriber - /subscribers/:subscriberId (DELETE)', function () {
  let session: UserSession;
  const subscriberRepository = new SubscriberRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should delete an existing subscriber', async function () {
    await axiosInstance.post(
      `${session.serverUrl}/v1/subscribers`,
      {
        subscriberId: '123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@doe.com',
        phone: '+972523333333',
      },
      {
        headers: {
          authorization: `ApiKey ${session.apiKey}`,
        },
      }
    );

    const createdSubscriber = await subscriberRepository.findBySubscriberId(session.environment._id, '123');
    expect(createdSubscriber.subscriberId).to.equal('123');

    await axiosInstance.delete(`${session.serverUrl}/v1/subscribers/123`, {
      headers: {
        authorization: `ApiKey ${session.apiKey}`,
      },
    });

    const isDeleted = !(await subscriberRepository.findBySubscriberId(session.environment._id, '123'));

    expect(isDeleted).to.equal(true);

    const deletedSubscriber = (
      await subscriberRepository.findDeleted({
        _environmentId: session.environment._id,
        subscriberId: '123',
      })
    )[0];

    expect(deletedSubscriber.deleted).to.equal(true);
  });
});
