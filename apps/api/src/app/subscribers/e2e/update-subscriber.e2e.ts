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
        email: 'john@doe.com',
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
        email: 'changed@mail.com',
        phone: '+972523333333',
        locale: 'sv',
        data: { test: 'test value' },
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
    expect(createdSubscriber?.lastName).to.equal('Test Changed');
    expect(createdSubscriber?.email).to.equal('changed@mail.com');
    expect(createdSubscriber?.phone).to.equal('+972523333333');
    expect(createdSubscriber?.locale).to.equal('sv');
    expect(createdSubscriber?.data?.test).to.equal('test value');
  });

  it('should allow unsetting the email', async function () {
    await axiosInstance.post(
      `${session.serverUrl}/v1/subscribers`,
      {
        subscriberId: '123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@doe.com',
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
        email: null,
        phone: '+972523333333',
        locale: 'sv',
        data: { test: 'test value' },
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
    expect(createdSubscriber?.lastName).to.equal('Test Changed');
    expect(createdSubscriber?.email).to.equal(null);
    expect(createdSubscriber?.phone).to.equal('+972523333333');
    expect(createdSubscriber?.locale).to.equal('sv');
    expect(createdSubscriber?.data?.test).to.equal('test value');
  });

  it('should update an existing subscriber credentials', async function () {
    await axiosInstance.post(
      `${session.serverUrl}/v1/subscribers`,
      {
        subscriberId: '123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@doe.com',
      },
      {
        headers: {
          authorization: `ApiKey ${session.apiKey}`,
        },
      }
    );

    const response = await axiosInstance.put(
      `${session.serverUrl}/v1/subscribers/123/credentials`,
      {
        subscriberId: '123',
        providerId: 'slack',
        credentials: { webhookUrl: 'webhookUrlNew' },
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

    const subscriberChannel = createdSubscriber?.channels?.find((channel) => channel.providerId === 'slack');

    expect(subscriberChannel?.providerId).to.equal('slack');
    expect(subscriberChannel?.credentials.webhookUrl).to.equal('webhookUrlNew');
  });
});
