import { expect } from 'chai';
import { randomBytes } from 'crypto';
import { UserSession } from '@novu/testing';
import { SubscriberResponseDto } from '@novu/api/models/components';
import { Novu } from '@novu/api';
import { expectSdkExceptionGeneric, initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

let session: UserSession;

describe('Get Subscriber - /subscribers/:subscriberId (GET) #novu-v2', () => {
  let subscriber: SubscriberResponseDto;
  let novuClient: Novu;

  beforeEach(async () => {
    const uuid = randomBytes(4).toString('hex');
    session = new UserSession();
    await session.initialize();
    subscriber = await createSubscriberAndValidate(uuid);
    novuClient = initNovuClassSdk(session);
  });

  it('should fetch subscriber by subscriberId', async () => {
    const res = await novuClient.subscribers.retrieve(subscriber.subscriberId);

    validateSubscriber(res.result, subscriber);
  });

  it('should return 404 if subscriberId does not exist', async () => {
    const invalidSubscriberId = `non-existent-${randomBytes(2).toString('hex')}`;
    const { error } = await expectSdkExceptionGeneric(() => novuClient.subscribers.retrieve(invalidSubscriberId));

    expect(error?.statusCode).to.equal(404);
  });
});

async function createSubscriberAndValidate(id: string = '') {
  const payload = {
    subscriberId: `test-subscriber-${id}`,
    firstName: `Test ${id}`,
    lastName: 'Subscriber',
    email: `test-${id}@subscriber.com`,
    phone: '+1234567890',
  };

  const res = await session.testAgent.post(`/v1/subscribers`).send(payload);
  expect(res.status).to.equal(201);

  const subscriber = res.body.data;

  validateSubscriber(subscriber, payload);

  return subscriber;
}

function validateSubscriber(subscriber: SubscriberResponseDto, expected: Partial<SubscriberResponseDto>) {
  expect(subscriber.subscriberId).to.equal(expected.subscriberId);
  expect(subscriber.firstName).to.equal(expected.firstName);
  expect(subscriber.lastName).to.equal(expected.lastName);
  expect(subscriber.email).to.equal(expected.email);
  expect(subscriber.phone).to.equal(expected.phone);
}
