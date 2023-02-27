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
        locale: 'en',
        data: { test1: 'test value1', test2: 'test value2' },
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

    expect(createdSubscriber?.firstName).to.equal('John');
    expect(createdSubscriber?.email).to.equal('john@doe.com');
    expect(createdSubscriber?.phone).to.equal('+972523333333');
    expect(createdSubscriber?.locale).to.equal('en');
    expect(createdSubscriber?.data?.test1).to.equal('test value1');
  });

  it('should update subscriber if already created', async function () {
    await axiosInstance.post(
      `${session.serverUrl}/v1/subscribers`,
      {
        subscriberId: '123',
        firstName: 'John',
        lastName: 'Doe',
        data: { test1: 'test value1', test2: 'test value2' },
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
        locale: 'en',
        data: { test1: 'new test value1', test3: 'test value3' },
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

    expect(createdSubscriber?.firstName).to.equal('Mary');
    expect(createdSubscriber?.email).to.equal('john@doe.com');
    expect(createdSubscriber?.locale).to.equal('en');
    expect(createdSubscriber?.data?.test1).to.equal('new test value1');
    expect(!createdSubscriber?.data?.test2).to.equal(true);
    expect(createdSubscriber?.data?.test3).to.equal('test value3');
  });
});
