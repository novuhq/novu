import { Novu } from '@novu/api';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { randomBytes } from 'crypto';
import {
  expectSdkExceptionGeneric,
  expectSdkValidationExceptionGeneric,
  initNovuClassSdk,
} from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';
import { SubscriberResponseDto } from '../../subscribers/dtos';

let session: UserSession;

describe('Update Subscriber - /subscribers/:subscriberId (PATCH) #novu-v2', () => {
  let subscriber: SubscriberResponseDto;
  let novuClient: Novu;

  beforeEach(async () => {
    const uuid = randomBytes(4).toString('hex');
    session = new UserSession();
    await session.initialize();
    subscriber = await createSubscriberAndValidate(uuid);
    novuClient = initNovuClassSdk(session);
  });

  it('should update the fields of the subscriber', async () => {
    const payload = {
      firstName: 'Updated First Name',
      lastName: 'Updated Last Name',
    };

    const res = await novuClient.subscribers.patch(payload, subscriber.subscriberId);

    const updatedSubscriber = res.result;

    expect(subscriber.firstName).to.not.equal(updatedSubscriber.firstName);
    expect(updatedSubscriber.firstName).to.equal(payload.firstName);
    expect(subscriber.lastName).to.not.equal(updatedSubscriber.lastName);
    expect(updatedSubscriber.lastName).to.equal(payload.lastName);

    expect(subscriber.subscriberId).to.equal(updatedSubscriber.subscriberId);
    expect(subscriber.email).to.equal(updatedSubscriber.email);
    expect(subscriber.phone).to.equal(updatedSubscriber.phone);
  });

  it('should return 404 if subscriberId does not exist', async () => {
    const payload = {
      firstName: 'Updated First Name',
      lastName: 'Updated Last Name',
    };

    const invalidSubscriberId = `non-existent-${randomBytes(2).toString('hex')}`;
    const { error } = await expectSdkExceptionGeneric(() => novuClient.subscribers.patch(payload, invalidSubscriberId));

    expect(error?.statusCode).to.equal(404);
  });

  it('should return the original subscriber if no fields are updated', async () => {
    const res = await novuClient.subscribers.patch({}, subscriber.subscriberId);

    const updatedSubscriber = res.result;

    expect(subscriber.firstName).to.equal(updatedSubscriber.firstName);
    expect(subscriber.lastName).to.equal(updatedSubscriber.lastName);
    expect(subscriber.email).to.equal(updatedSubscriber.email);
    expect(subscriber.phone).to.equal(updatedSubscriber.phone);
  });

  it('should clear simple fields with null', async () => {
    const payload = {
      firstName: null,
      lastName: null,
      phone: null,
      avatar: null,
    };

    const res = await novuClient.subscribers.patch(payload, subscriber.subscriberId);
    const updatedSubscriber = res.result;

    expect(updatedSubscriber.firstName).to.be.null;
    expect(updatedSubscriber.lastName).to.be.null;
    expect(updatedSubscriber.phone).to.be.null;
    expect(updatedSubscriber.avatar).to.be.null;
  });

  it('should clear simple fields with empty string', async () => {
    const payload = {
      firstName: '',
      lastName: '',
      phone: '',
      avatar: '',
    };

    const res = await novuClient.subscribers.patch(payload, subscriber.subscriberId);
    const updatedSubscriber = res.result;

    expect(updatedSubscriber.firstName).to.equal(payload.firstName);
    expect(updatedSubscriber.lastName).to.equal(payload.lastName);
    expect(updatedSubscriber.phone).to.equal(payload.phone);
    expect(updatedSubscriber.avatar).to.equal(payload.avatar);
  });

  it('should clear complex fields with null', async () => {
    const payload = {
      email: null,
      locale: null,
      timezone: null,
    };

    const res = await novuClient.subscribers.patch(payload, subscriber.subscriberId);
    const updatedSubscriber = res.result;

    expect(updatedSubscriber.email).to.be.null;
    expect(updatedSubscriber.locale).to.be.null;
    expect(updatedSubscriber.timezone).to.be.null;
  });

  it('should reject empty strings for complex fields (email)', async () => {
    const payload = {
      email: '',
    };

    const { error } = await expectSdkValidationExceptionGeneric(() =>
      novuClient.subscribers.patch(payload, subscriber.subscriberId)
    );

    expect(error?.statusCode).to.equal(422);
    const errorMessages = JSON.stringify(error?.errors);
    expect(errorMessages).to.include('email');
  });

  it('should reject empty strings for complex fields (locale)', async () => {
    const payload = {
      locale: '',
    };

    const { error } = await expectSdkValidationExceptionGeneric(() =>
      novuClient.subscribers.patch(payload, subscriber.subscriberId)
    );

    expect(error?.statusCode).to.equal(422);
    const errorMessages = JSON.stringify(error?.errors);
    expect(errorMessages).to.include('locale');
  });

  it('should reject empty strings for complex fields (timezone)', async () => {
    const payload = {
      timezone: '',
    };

    const { error } = await expectSdkValidationExceptionGeneric(() =>
      novuClient.subscribers.patch(payload, subscriber.subscriberId)
    );

    expect(error?.statusCode).to.equal(422);
    const errorMessages = JSON.stringify(error?.errors);
    expect(errorMessages).to.include('timezone');
  });

  it('should validate email format', async () => {
    const payload = {
      email: 'invalid-email',
    };

    const { error } = await expectSdkValidationExceptionGeneric(() =>
      novuClient.subscribers.patch(payload, subscriber.subscriberId)
    );

    expect(error?.statusCode).to.equal(422);
    const errorMessages = JSON.stringify(error?.errors);
    expect(errorMessages).to.include('email');
  });

  it('should validate locale format', async () => {
    const payload = {
      locale: '!!!invalid!!!',
    };

    const { error } = await expectSdkValidationExceptionGeneric(() =>
      novuClient.subscribers.patch(payload, subscriber.subscriberId)
    );

    expect(error?.statusCode).to.equal(422);
    const errorMessages = JSON.stringify(error?.errors);
    expect(errorMessages).to.include('locale');
  });

  it('should validate timezone format', async () => {
    const payload = {
      timezone: 'Invalid/Timezone',
    };

    const { error } = await expectSdkValidationExceptionGeneric(() =>
      novuClient.subscribers.patch(payload, subscriber.subscriberId)
    );

    expect(error?.statusCode).to.equal(422);
    const errorMessages = JSON.stringify(error?.errors);
    expect(errorMessages).to.include('timezone');
  });

  it('should clear data field with null', async () => {
    const payload = {
      data: null,
    };

    const res = await novuClient.subscribers.patch(payload, subscriber.subscriberId);
    const updatedSubscriber = res.result;

    expect(updatedSubscriber.data).to.be.null;
  });

  it('should not change fields that are not provided (undefined semantics)', async () => {
    const payload = {
      firstName: 'Updated Name',
    };

    const res = await novuClient.subscribers.patch(payload, subscriber.subscriberId);
    const updatedSubscriber = res.result;

    expect(updatedSubscriber.firstName).to.equal('Updated Name');
    expect(updatedSubscriber.email).to.equal(subscriber.email);
    expect(updatedSubscriber.phone).to.equal(subscriber.phone);
  });

  it('should not allow updating subscriberId', async () => {
    const newSubscriberId = `new-subscriber-${randomBytes(4).toString('hex')}`;
    const payload = {
      subscriberId: newSubscriberId,
      firstName: 'Updated',
    };

    const res = await novuClient.subscribers.patch(payload as any, subscriber.subscriberId);
    const updatedSubscriber = res.result;

    expect(updatedSubscriber.subscriberId).to.equal(subscriber.subscriberId);
    expect(updatedSubscriber.subscriberId).to.not.equal(newSubscriberId);
    expect(updatedSubscriber.firstName).to.equal('Updated');
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

  expect(subscriber.subscriberId).to.equal(payload.subscriberId);
  expect(subscriber.firstName).to.equal(payload.firstName);
  expect(subscriber.lastName).to.equal(payload.lastName);
  expect(subscriber.email).to.equal(payload.email);
  expect(subscriber.phone).to.equal(payload.phone);

  return subscriber;
}
