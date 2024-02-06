import { expect } from 'chai';
import axios from 'axios';
import { SubscriberRepository, SubscriberEntity } from '@novu/dal';
import { UserSession, SubscribersService } from '@novu/testing';

const axiosInstance = axios.create();

describe('Bulk create subscribers - /v1/subscribers/bulk (POST)', function () {
  const BULK_API_ENDPOINT = '/v1/subscribers/bulk';
  let session: UserSession;
  let subscriber: SubscriberEntity;
  let subscriberService: SubscribersService;
  const subscriberRepository = new SubscriberRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    subscriberService = new SubscribersService(session.organization._id, session.environment._id);
    subscriber = await subscriberService.createSubscriber();
  });

  it('should return the response array in correct format', async function () {
    const { data: body } = await axiosInstance.post(
      `${session.serverUrl}${BULK_API_ENDPOINT}`,
      {
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
      },
      {
        headers: {
          authorization: `ApiKey ${session.apiKey}`,
        },
      }
    );

    expect(body.data).to.be.ok;
    const response = body.data;
    const { updated, created, failed } = response;

    expect(updated?.length).to.equal(2);
    expect(updated[0].subscriberId).to.equal(subscriber.subscriberId);
    expect(updated[1].subscriberId).to.equal('test2');

    expect(created?.length).to.equal(2);
    expect(created[0].subscriberId).to.equal('test1');
    expect(created[1].subscriberId).to.equal('test2');

    expect(failed?.length).to.equal(0);
  });

  it('should create and update subscribers', async function () {
    const { data: body } = await axiosInstance.post(
      `${session.serverUrl}${BULK_API_ENDPOINT}`,
      {
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
      },
      {
        headers: {
          authorization: `ApiKey ${session.apiKey}`,
        },
      }
    );
    expect(body.data).to.be.ok;

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

    try {
      await axiosInstance.post(
        `${session.serverUrl}${BULK_API_ENDPOINT}`,
        {
          subscribers: Array.from({ length: 501 }, () => payload),
        },
        {
          headers: {
            authorization: `ApiKey ${session.apiKey}`,
          },
        }
      );
      expect.fail();
    } catch (error) {
      expect(error).to.be.ok;
      expect(error.response.status).to.equal(400);
      expect(error.response.data.message[0]).to.equal('subscribers must contain no more than 500 elements');
    }
  });

  it('should allow recreate deleted subscribers', async function () {
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
    const { data: body } = await axiosInstance.post(
      `${session.serverUrl}${BULK_API_ENDPOINT}`,
      {
        subscribers: [existingSubscriber, newSubscriber1, newSubscriber2],
      },
      {
        headers: {
          authorization: `ApiKey ${session.apiKey}`,
        },
      }
    );
    expect(body.data).to.be.ok;

    const {
      data: { updated, created },
    } = body;

    expect(updated?.length).to.equal(1);
    expect(created?.length).to.equal(2);
    expect(updated[0].subscriberId).to.equal(existingSubscriber.subscriberId);
    expect(created[0].subscriberId).to.equal(newSubscriber1.subscriberId);
    expect(created[1].subscriberId).to.equal(newSubscriber2.subscriberId);

    // delete the two created subscribers
    await axiosInstance.delete(`${session.serverUrl}/v1/subscribers/${newSubscriber1.subscriberId}`, {
      headers: {
        authorization: `ApiKey ${session.apiKey}`,
      },
    });
    await axiosInstance.delete(`${session.serverUrl}/v1/subscribers/${newSubscriber2.subscriberId}`, {
      headers: {
        authorization: `ApiKey ${session.apiKey}`,
      },
    });

    // recreate the deleted subscribers
    const { data: recreateBody } = await axiosInstance.post(
      `${session.serverUrl}${BULK_API_ENDPOINT}`,
      {
        subscribers: [existingSubscriber, newSubscriber1, newSubscriber2],
      },
      {
        headers: {
          authorization: `ApiKey ${session.apiKey}`,
        },
      }
    );

    expect(recreateBody.data).to.be.ok;
    const {
      data: { updated: updatedAgain },
    } = recreateBody;

    expect(updatedAgain?.length).to.equal(3);
    expect(updatedAgain[0].subscriberId).to.equal(existingSubscriber.subscriberId);
    expect(updatedAgain[1].subscriberId).to.equal(newSubscriber1.subscriberId);
    expect(updatedAgain[2].subscriberId).to.equal(newSubscriber2.subscriberId);

    // check that they are not marked as deleted
    const recreatedSubscriber1 = await subscriberRepository.findBySubscriberId(
      session.environment._id,
      newSubscriber1.subscriberId
    );
    const recreatedSubscriber2 = await subscriberRepository.findBySubscriberId(
      session.environment._id,
      newSubscriber2.subscriberId
    );
    expect(recreatedSubscriber1.deleted).to.be.false;
    expect(recreatedSubscriber2.deleted).to.be.false;
  });
});
