import { UserSession } from '@novu/testing';
import { SubscriberRepository } from '@novu/dal';
import { expect } from 'chai';
import axios from 'axios';

const axiosInstance = axios.create();

describe('Create Subscriber - /subscribers (POST)', function () {
  let session: UserSession;
  const subscriberRepository = new SubscriberRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should create a new subscriber', async function () {
    const response = await axiosInstance.post(
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

    const { data: body } = response;

    expect(body.data).to.be.ok;
    const createdSubscriber = await subscriberRepository.findBySubscriberId(session.environment._id, '123');

    expect(createdSubscriber.firstName).to.equal('John');
    expect(createdSubscriber.email).to.equal('john@doe.com');
    expect(createdSubscriber.phone).to.equal('+972523333333');
  });

  it('should update subscriber if already created', async function () {
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

    await axiosInstance.post(
      `${session.serverUrl}/v1/subscribers`,
      {
        subscriberId: '456',
        firstName: 'John',
        lastName: 'Doe',
      },
      {
        headers: {
          authorization: `ApiKey ${session.apiKey}`,
        },
      }
    );
    const response = await axiosInstance.post(
      `${session.serverUrl}/v1/subscribers`,
      {
        subscriberId: '123',
        firstName: 'Mary',
        lastName: 'Doe',
        email: 'john@doe.com',
      },
      {
        headers: {
          authorization: `ApiKey ${session.apiKey}`,
        },
      }
    );

    const { data: body } = response;

    expect(body.data).to.be.ok;
    const createdSubscriber = await subscriberRepository.findBySubscriberId(session.environment._id, '123');

    expect(createdSubscriber.firstName).to.equal('Mary');
    expect(createdSubscriber.email).to.equal('john@doe.com');
  });
});
