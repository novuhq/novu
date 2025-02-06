import { UserSession } from '@novu/testing';
import { SubscriberRepository } from '@novu/dal';
import { expect } from 'chai';
import { Novu } from '@novu/api';
import { initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

const subscriberId = '123';
describe('Update Subscriber - /subscribers/:subscriberId (PUT) #novu-v2', function () {
  let session: UserSession;
  const subscriberRepository = new SubscriberRepository();
  let novuClient: Novu;
  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    novuClient = initNovuClassSdk(session);
  });

  it('should update an existing subscriber', async function () {
    await novuClient.subscribers.create({
      subscriberId,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@doe.com',
    });

    const response = await novuClient.subscribers.updateLegacy(
      {
        lastName: 'Test Changed',
        email: 'changed@mail.com',
        phone: '+972523333333',
        locale: 'sv',
        data: { test: 'test value' },
      },
      subscriberId
    );

    const { result: body } = response;

    expect(body).to.be.ok;
    const createdSubscriber = await subscriberRepository.findBySubscriberId(session.environment._id, subscriberId);

    expect(createdSubscriber?.firstName).to.equal('John');
    expect(createdSubscriber?.lastName).to.equal('Test Changed');
    expect(createdSubscriber?.email).to.equal('changed@mail.com');
    expect(createdSubscriber?.phone).to.equal('+972523333333');
    expect(createdSubscriber?.locale).to.equal('sv');
    expect(createdSubscriber?.data?.test).to.equal('test value');
  });

  it('should allow unsetting the email', async function () {
    await novuClient.subscribers.create({
      subscriberId,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@doe.com',
    });

    const response = await novuClient.subscribers.updateLegacy(
      {
        lastName: 'Test Changed',
        phone: '+972523333333',
        locale: 'sv',
        data: { test: 'test value' },
        email: '',
      },
      subscriberId
    );

    const { result: body } = response;

    expect(body).to.be.ok;
    const createdSubscriber = await subscriberRepository.findBySubscriberId(session.environment._id, subscriberId);

    expect(createdSubscriber?.firstName).to.equal('John');
    expect(createdSubscriber?.lastName).to.equal('Test Changed');
    expect(createdSubscriber?.email).to.equal(null);
    expect(createdSubscriber?.phone).to.equal('+972523333333');
    expect(createdSubscriber?.locale).to.equal('sv');
    expect(createdSubscriber?.data?.test).to.equal('test value');
  });

  it('should update an existing subscriber credentials', async function () {
    await novuClient.subscribers.create({
      subscriberId,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@doe.com',
    });
    const response = await novuClient.subscribers.credentials.update(
      {
        providerId: 'slack',
        credentials: { webhookUrl: 'webhookUrlNew' },
      },
      subscriberId
    );

    const { result: body } = response;

    expect(body).to.be.ok;
    const createdSubscriber = await subscriberRepository.findBySubscriberId(session.environment._id, subscriberId);

    const subscriberChannel = createdSubscriber?.channels?.find((channel) => channel.providerId === 'slack');

    expect(subscriberChannel?.providerId).to.equal('slack');
    expect(subscriberChannel?.credentials.webhookUrl).to.equal('webhookUrlNew');
  });
});
