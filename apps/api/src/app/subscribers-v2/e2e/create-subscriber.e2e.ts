import { Novu } from '@novu/api';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { randomBytes } from 'crypto';
import { expectSdkExceptionGeneric, initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

let session: UserSession;

describe('Create Subscriber - /subscribers (POST) #novu-v2', () => {
  let novuClient: Novu;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    novuClient = initNovuClassSdk(session);
  });

  it('should create the subscriber', async () => {
    const subscriberId = `test-subscriber-${`${randomBytes(4).toString('hex')}`}`;
    const payload = {
      subscriberId,
      firstName: 'First Name',
      lastName: 'Last Name',
      locale: 'en_US',
      timezone: 'America/New_York',
      data: { test1: 'test value1', test2: 'test value2' },
    };

    const { result: subscriber } = await novuClient.subscribers.create(payload);

    expect(subscriber.subscriberId).to.equal(payload.subscriberId);
    expect(subscriber.firstName).to.equal(payload.firstName);
    expect(subscriber.lastName).to.equal(payload.lastName);
    expect(subscriber.locale).to.equal(payload.locale);
    expect(subscriber.timezone).to.equal(payload.timezone);
    expect(subscriber.data).to.deep.equal(payload.data);
  });

  it('should upsert an existing subscriber if the subscriberId matches', async () => {
    const subscriberId = `test-subscriber-${`${randomBytes(4).toString('hex')}`}`;
    const payload1 = {
      subscriberId,
      firstName: 'First Name',
      locale: 'en_US',
      data: { foo: 42 },
    };

    const { result: subscriber } = await novuClient.subscribers.create(payload1);

    expect(subscriber.subscriberId).to.equal(payload1.subscriberId);
    expect(subscriber.firstName).to.equal(payload1.firstName);
    expect(subscriber.lastName).to.be.undefined;
    expect(subscriber.locale).to.equal(payload1.locale);
    expect(subscriber.timezone).to.be.undefined;
    expect(subscriber.data).to.deep.equal(payload1.data);

    const payload2 = {
      subscriberId,
      firstName: 'First Name 2',
      lastName: 'Last Name 2',
      timezone: 'America/New_York',
      data: { foo: 42, bar: '42' },
    };

    const { result: updatedSubscriber } = await novuClient.subscribers.create(payload2);

    expect(updatedSubscriber.subscriberId).to.equal(payload2.subscriberId);
    expect(updatedSubscriber.firstName).to.equal(payload2.firstName);
    expect(updatedSubscriber.lastName).to.equal(payload2.lastName);
    expect(updatedSubscriber.timezone).to.equal(payload2.timezone);

    expect(updatedSubscriber.data).to.deep.equal(payload2.data);

    const {
      result: { data: subscribers },
    } = await novuClient.subscribers.search({ subscriberId });
    expect(subscribers.length).to.equal(1);
  });

  it('should create the subscriber with null values', async () => {
    const subscriberId = `test-subscriber-${`${randomBytes(4).toString('hex')}`}`;
    const payload = {
      subscriberId,
    };

    const { result: subscriber } = await novuClient.subscribers.create(payload);

    expect(subscriber.subscriberId).to.equal(payload.subscriberId);

    expect(subscriber.firstName).to.be.undefined;
    expect(subscriber.lastName).to.be.undefined;
  });
});
