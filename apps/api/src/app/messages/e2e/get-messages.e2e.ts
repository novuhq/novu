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
});
