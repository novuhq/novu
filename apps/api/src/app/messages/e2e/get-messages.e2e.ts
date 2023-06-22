import { SubscribersService, UserSession } from '@novu/testing';
import { NotificationTemplateEntity, SubscriberEntity } from '@novu/dal';
import axios from 'axios';
import { expect } from 'chai';
import { ChannelTypeEnum } from '@novu/shared';

const axiosInstance = axios.create();

describe('Get Message - /messages (GET)', function () {
  let session: UserSession;
  let template: NotificationTemplateEntity;
  let subscriber: SubscriberEntity;
  let subscriberService: SubscribersService;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    template = await session.createTemplate();
    subscriberService = new SubscribersService(session.organization._id, session.environment._id);
    subscriber = await subscriberService.createSubscriber();
  });

  it('should fetch existing messages', async function () {
    const subscriber2 = await subscriberService.createSubscriber();
    await axiosInstance.post(
      `${session.serverUrl}/v1/events/trigger`,
      {
        name: template.triggers[0].identifier,
        to: [
          { subscriberId: subscriber.subscriberId, email: 'gg@ff.com' },
          { subscriberId: subscriber2.subscriberId, email: 'john@doe.com' },
        ],
        payload: {
          email: 'new-test-email@gmail.com',
          firstName: 'Testing of User Name',
          urlVar: '/test/url/path',
        },
      },
      {
        headers: {
          authorization: `ApiKey ${session.apiKey}`,
        },
      }
    );

    await session.awaitRunningJobs(template._id);

    let body = await axiosInstance.get(`${session.serverUrl}/v1/messages/`, {
      headers: {
        authorization: `ApiKey ${session.apiKey}`,
      },
    });
    expect(body.data.data.length).to.be.equal(4);

    body = await axiosInstance.get(`${session.serverUrl}/v1/messages?channel=${ChannelTypeEnum.EMAIL}`, {
      headers: {
        authorization: `ApiKey ${session.apiKey}`,
      },
    });
    expect(body.data.data.length).to.be.equal(2);

    body = await axiosInstance.get(`${session.serverUrl}/v1/messages?subscriberId=${subscriber2.subscriberId}`, {
      headers: {
        authorization: `ApiKey ${session.apiKey}`,
      },
    });
    expect(body.data.data.length).to.be.equal(2);
  });

  it('should fetch messages using transactionId filter', async function () {
    const subscriber3 = await subscriberService.createSubscriber();

    const transactionId1 = '1566f9d0-6037-48c1-b356-42667921cadd';
    const transactionId2 = 'd2d9f9b5-4a96-403a-927f-1f8f40c6c7a9';

    await triggerEventWithTransactionId(template.triggers[0].identifier, subscriber3.subscriberId, transactionId1);
    await triggerEventWithTransactionId(template.triggers[0].identifier, subscriber3.subscriberId, transactionId2);
    await triggerEventWithTransactionId(template.triggers[0].identifier, subscriber3.subscriberId, transactionId1);

    await session.awaitRunningJobs(template._id);

    let body = await axiosInstance.get(`${session.serverUrl}/v1/messages?subscriberId=${subscriber3.subscriberId}`, {
      headers: {
        authorization: `ApiKey ${session.apiKey}`,
      },
    });

    // here we are expecting 6 messages because workflow has 2 steps in-app and email
    expect(body.data.data.length).to.be.equal(6);

    body = await axiosInstance.get(`${session.serverUrl}/v1/messages?transactionId=${transactionId1}`, {
      headers: {
        authorization: `ApiKey ${session.apiKey}`,
      },
    });
    expect(body.data.data.length).to.be.equal(4);

    body = await axiosInstance.get(
      `${session.serverUrl}/v1/messages?transactionId=${transactionId1}&transactionId=${transactionId2}`,
      {
        headers: {
          authorization: `ApiKey ${session.apiKey}`,
        },
      }
    );
    expect(body.data.data.length).to.be.equal(6);

    body = await axiosInstance.get(`${session.serverUrl}/v1/messages?transactionId=${transactionId2}`, {
      headers: {
        authorization: `ApiKey ${session.apiKey}`,
      },
    });
    expect(body.data.data.length).to.be.equal(2);
  });

  const triggerEventWithTransactionId = async (
    templateIdentifier: string,
    subscriberId: string,
    transactionId: string
  ) => {
    await axiosInstance.post(
      `${session.serverUrl}/v1/events/trigger`,
      {
        name: templateIdentifier,
        to: { subscriberId: subscriberId, email: 'gg@ff.com' },
        payload: {},
        transactionId: transactionId,
      },
      {
        headers: {
          authorization: `ApiKey ${session.apiKey}`,
        },
      }
    );
  };
});
