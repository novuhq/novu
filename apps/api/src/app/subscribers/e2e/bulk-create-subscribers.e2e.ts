import { expect } from 'chai';
import { SubscriberEntity, SubscriberRepository } from '@novu/dal';
import { SubscribersService, UserSession } from '@novu/testing';
import { Novu } from '@novu/api';
import { expectSdkValidationExceptionGeneric, initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Bulk create subscribers - /v1/subscribers/bulk (POST) #novu-v2', function () {
  let session: UserSession;
  let subscriber: SubscriberEntity;
  let subscriberService: SubscribersService;
  const subscriberRepository = new SubscriberRepository();
  let novuClient: Novu;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    subscriberService = new SubscribersService(session.organization._id, session.environment._id);
    subscriber = await subscriberService.createSubscriber();
    novuClient = initNovuClassSdk(session);
  });

  it('should return the response array in correct format', async function () {
    const bulkResult = await novuClient.subscribers.createBulk({
      subscribers: [
        {
          subscriberId: 'test1',
          firstName: 'sub1',
          email: 'sub1@test.co',
        },
        {
          subscriberId: 'test2',
          firstName: 'sub2',
          email: 'sub2@test.co',
        },
        { subscriberId: subscriber.subscriberId, firstName: 'update name' },
        { subscriberId: 'test2', firstName: 'update name' },
      ],
    });

    expect(bulkResult.result).to.be.ok;
    const { updated, created, failed } = bulkResult.result;

    expect(updated?.length).to.equal(2);
    expect(updated[0].subscriberId).to.equal(subscriber.subscriberId);
    expect(updated[1].subscriberId).to.equal('test2');

    expect(created?.length).to.equal(2);
    expect(created[0].subscriberId).to.equal('test1');
    expect(created[1].subscriberId).to.equal('test2');

    expect(failed?.length).to.equal(0);
  });

  it('should create and update subscribers', async function () {
    const res = await novuClient.subscribers.createBulk({
      subscribers: [
        {
          subscriberId: 'sub1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@doe.com',
          phone: '+972523333333',
          locale: 'en',
          data: { test1: 'test value1', test2: 'test value2' },
        },
        {
          subscriberId: 'test2',
          firstName: 'sub2',
          email: 'sub2@test.co',
        },
        {
          subscriberId: 'test3',
          firstName: 'sub3',
          email: 'sub3@test.co',
        },
        { subscriberId: subscriber.subscriberId, firstName: 'update' },
        {
          subscriberId: 'test4',
          firstName: 'sub4',
          email: 'sub4@test.co',
        },
      ],
    });
    expect(res.result).to.be.ok;

    const createdSubscriber = await subscriberRepository.findBySubscriberId(session.environment._id, 'sub1');
    const updatedSubscriber = await subscriberRepository.findBySubscriberId(
      session.environment._id,
      subscriber.subscriberId
    );

    expect(updatedSubscriber?.firstName).to.equal('update');
    expect(createdSubscriber?.firstName).to.equal('John');
    expect(createdSubscriber?.email).to.equal('john@doe.com');
    expect(createdSubscriber?.phone).to.equal('+972523333333');
    expect(createdSubscriber?.locale).to.equal('en');
    expect(createdSubscriber?.data?.test1).to.equal('test value1');
  });

  it('should throw an error when sending more than 500 subscribers', async function () {
    const payload = {
      subscriberId: 'test2',
      firstName: 'sub2',
      email: 'sub2@test.co',
    };

    const { error } = await expectSdkValidationExceptionGeneric(() =>
      novuClient.subscribers.createBulk({
        subscribers: Array.from({ length: 501 }, () => payload),
      })
    );

    expect(error?.statusCode, JSON.stringify(error)).to.equal(422);
    expect(error?.errors.subscribers.messages[0], JSON.stringify(error)).to.equal(
      'subscribers must contain no more than 500 elements'
    );
  });

  it('should recreate deleted subscribers', async function () {
    const existingSubscriber = { subscriberId: subscriber.subscriberId, firstName: 'existingSubscriber' };
    const newSubscriber1 = {
      subscriberId: 'test1',
      firstName: 'sub1',
      email: 'sub1@test.co',
    };
    const newSubscriber2 = {
      subscriberId: 'test2',
      firstName: 'sub2',
      email: 'sub2@test.co',
    };
    let bulkResponse = await novuClient.subscribers.createBulk({
      subscribers: [existingSubscriber, newSubscriber1, newSubscriber2],
    });

    const { result } = bulkResponse;
    expect(result.created?.length).to.equal(2);
    expect(result.updated?.length).to.equal(1);
    expect(result.created[0].subscriberId).to.equal(newSubscriber1.subscriberId);
    expect(result.created[1].subscriberId).to.equal(newSubscriber2.subscriberId);
    expect(result.updated[0].subscriberId).to.equal(existingSubscriber.subscriberId);

    await novuClient.subscribers.delete(newSubscriber1.subscriberId);
    await novuClient.subscribers.delete(newSubscriber2.subscriberId);

    bulkResponse = await novuClient.subscribers.createBulk({
      subscribers: [existingSubscriber, newSubscriber1, newSubscriber2],
    });
    const secondResponseData = bulkResponse.result;
    expect(secondResponseData.created?.length).to.equal(2);
    expect(secondResponseData.updated?.length).to.equal(1);
    expect(secondResponseData.created[0].subscriberId).to.equal(newSubscriber1.subscriberId);
    expect(secondResponseData.created[1].subscriberId).to.equal(newSubscriber2.subscriberId);
    expect(secondResponseData.updated[0].subscriberId).to.equal(existingSubscriber.subscriberId);
  });
});
