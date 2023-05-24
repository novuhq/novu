import { expect } from 'chai';
import axios from 'axios';
import { MessageRepository, NotificationRepository, NotificationTemplateEntity, SubscriberEntity } from '@novu/dal';
import { UserSession, SubscribersService } from '@novu/testing';
import { ChannelTypeEnum, StepTypeEnum } from '@novu/shared';

const axiosInstance = axios.create();

describe('Trigger bulk events - /v1/events/trigger/bulk (POST)', function () {
  const BULK_API_ENDPOINT = '/v1/events/trigger/bulk';
  let session: UserSession;
  let template: NotificationTemplateEntity;
  let secondTemplate: NotificationTemplateEntity;
  let subscriber: SubscriberEntity;
  let secondSubscriber: SubscriberEntity;
  let subscriberService: SubscribersService;
  const notificationRepository = new NotificationRepository();
  const messageRepository = new MessageRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    template = await session.createTemplate();
    secondTemplate = await session.createTemplate({
      steps: [
        {
          type: StepTypeEnum.SMS,
          content: 'Hello {{firstName}}',
        },
      ],
    });
    subscriberService = new SubscribersService(session.organization._id, session.environment._id);
    subscriber = await subscriberService.createSubscriber();
    secondSubscriber = await subscriberService.createSubscriber();
  });

  it('should return the response array in correct order', async function () {
    const response = await axiosInstance.post(
      `${session.serverUrl}${BULK_API_ENDPOINT}`,
      {
        events: [
          {
            transactionId: '1111',
            name: template.triggers[0].identifier,
            to: subscriber.subscriberId,
            payload: {
              firstName: 'Testing of User Name',
              urlVariable: '/test/url/path',
            },
          },
          {
            transactionId: '2222',
            name: template.triggers[0].identifier,
            to: subscriber.subscriberId,
            payload: {
              firstName: 'Testing of User Name',
              urlVariable: '/test/url/path',
            },
          },
          {
            transactionId: '3333',
            name: template.triggers[0].identifier,
            to: subscriber.subscriberId,
            payload: {
              firstName: 'Testing of User Name',
              urlVariable: '/test/url/path',
            },
          },
        ],
      },
      {
        headers: {
          authorization: `ApiKey ${session.apiKey}`,
        },
      }
    );

    const { data: body } = response;
    expect(body.data).to.be.ok;
    expect(body.data.length).to.equal(3);

    const firstEvent = body.data[0];
    expect(firstEvent.status).to.equal('processed');
    expect(firstEvent.acknowledged).to.equal(true);
    expect(firstEvent.transactionId).to.equal('1111');

    const secondEvent = body.data[1];
    expect(secondEvent.status).to.equal('processed');
    expect(secondEvent.acknowledged).to.equal(true);
    expect(secondEvent.transactionId).to.equal('2222');

    const thirdEvent = body.data[2];
    expect(thirdEvent.status).to.equal('processed');
    expect(thirdEvent.acknowledged).to.equal(true);
    expect(thirdEvent.transactionId).to.equal('3333');
  });

  it('should generate message and notification based on a bulk event', async function () {
    const { data: body } = await axiosInstance.post(
      `${session.serverUrl}${BULK_API_ENDPOINT}`,
      {
        events: [
          {
            name: template.triggers[0].identifier,
            to: {
              subscriberId: subscriber.subscriberId,
            },
            payload: {
              firstName: 'Testing of User Name',
              urlVar: '/test/url/path',
            },
          },
          {
            name: secondTemplate.triggers[0].identifier,
            to: {
              subscriberId: secondSubscriber.subscriberId,
            },
            payload: {
              firstName: 'This is a second template',
            },
          },
        ],
      },
      {
        headers: {
          authorization: `ApiKey ${session.apiKey}`,
        },
      }
    );

    await session.awaitRunningJobs(template._id);
    await session.awaitRunningJobs(secondTemplate._id);

    const notifications = await notificationRepository.findBySubscriberId(session.environment._id, subscriber._id);
    expect(notifications.length).to.equal(1);

    const notification = notifications[0];

    expect(notification._organizationId).to.equal(session.organization._id);
    expect(notification._templateId).to.equal(template._id);

    const messages = await messageRepository.findBySubscriberChannel(
      session.environment._id,
      subscriber._id,
      ChannelTypeEnum.IN_APP
    );

    expect(messages.length).to.equal(1);
    const message = messages[0];

    expect(message.channel).to.equal(ChannelTypeEnum.IN_APP);
    expect(message.content as string).to.equal('Test content for <b>Testing of User Name</b>');
    expect(message.seen).to.equal(false);
    expect(message.cta.data.url).to.equal('/cypress/test-shell/example/test?test-param=true');
    expect(message.lastSeenDate).to.be.not.ok;
    expect(message.payload.firstName).to.equal('Testing of User Name');
    expect(message.payload.urlVar).to.equal('/test/url/path');
    expect(message.payload.attachments).to.be.not.ok;

    const emails = await messageRepository.findBySubscriberChannel(
      session.environment._id,
      subscriber._id,
      ChannelTypeEnum.EMAIL
    );

    expect(emails.length).to.equal(1);
    const email = emails[0];

    expect(email.channel).to.equal(ChannelTypeEnum.EMAIL);

    // Validate second template execution
    const otherSubscriberSms = await messageRepository.findBySubscriberChannel(
      session.environment._id,
      subscriber._id,
      ChannelTypeEnum.SMS
    );
    expect(otherSubscriberSms.length).to.equal(0);

    const sms = await messageRepository.findBySubscriberChannel(
      session.environment._id,
      secondSubscriber._id,
      ChannelTypeEnum.SMS
    );

    expect(sms.length).to.equal(1);

    const smsMessage = sms[0];
    expect(smsMessage.content).to.equal(`Hello This is a second template`);

    const secondSubscriberNotifications = await notificationRepository.findBySubscriberId(
      session.environment._id,
      secondSubscriber._id
    );
    expect(secondSubscriberNotifications.length).to.equal(1);

    const secondSubscriberNotification = secondSubscriberNotifications[0];

    expect(secondSubscriberNotification._organizationId).to.equal(session.organization._id);
    expect(secondSubscriberNotification._templateId).to.equal(secondTemplate._id);
  });

  it('should throw an error when sending more than 100 events', async function () {
    const event = {
      transactionId: '2222',
      name: template.triggers[0].identifier,
      to: subscriber.subscriberId,
      payload: {
        firstName: 'Testing of User Name',
        urlVariable: '/test/url/path',
      },
    };

    let error;
    try {
      await axiosInstance.post(
        `${session.serverUrl}${BULK_API_ENDPOINT}`,
        {
          events: Array.from({ length: 101 }, () => event),
        },
        {
          headers: {
            authorization: `ApiKey ${session.apiKey}`,
          },
        }
      );
    } catch (e) {
      error = e;
    }

    expect(error).to.be.ok;
    expect(error.response.status).to.equal(400);
    expect(error.response.data.message[0]).to.equal('events must contain no more than 100 elements');
  });

  it('should handle bulk if one of the events returns errors', async function () {
    const response = await axiosInstance.post(
      `${session.serverUrl}${BULK_API_ENDPOINT}`,
      {
        events: [
          {
            transactionId: '1111',
            name: 'non-existing-trigger',
            to: subscriber.subscriberId,
            payload: {
              firstName: 'Testing of User Name',
              urlVariable: '/test/url/path',
            },
          },
          {
            transactionId: '2222',
            name: template.triggers[0].identifier,
            to: subscriber.subscriberId,
            payload: {
              firstName: 'Testing of User Name',
              urlVariable: '/test/url/path',
            },
          },
          {
            transactionId: '1111',
            payload: {
              firstName: 'Testing of User Name',
              urlVariable: '/test/url/path',
            },
          },
        ],
      },
      {
        headers: {
          authorization: `ApiKey ${session.apiKey}`,
        },
      }
    );

    const { data: body } = response;
    expect(body.data).to.be.ok;
    expect(body.data.length).to.equal(3);

    const errorEvent = body.data[0];
    expect(errorEvent.error[0]).to.equal('workflow_not_found');
    expect(errorEvent.status).to.equal('error');

    expect(body.data[1].status).to.equal('processed');
  });
});
