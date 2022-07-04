import {
  LogRepository,
  MessageRepository,
  NotificationRepository,
  NotificationTemplateEntity,
  SubscriberEntity,
  SubscriberRepository,
  JobRepository,
  JobEntity,
  JobStatusEnum,
} from '@novu/dal';
import { UserSession, SubscribersService } from '@novu/testing';

import { expect } from 'chai';
import { ChannelTypeEnum, IEmailBlock } from '@novu/shared';
import axios from 'axios';
import { ISubscribersDefine } from '@novu/node';

const axiosInstance = axios.create();

describe('Trigger event - /v1/events/trigger (POST)', function () {
  let session: UserSession;
  let template: NotificationTemplateEntity;
  let subscriber: SubscriberEntity;
  let subscriberService: SubscribersService;
  const notificationRepository = new NotificationRepository();
  const messageRepository = new MessageRepository();
  const subscriberRepository = new SubscriberRepository();
  const logRepository = new LogRepository();
  const jobRepository = new JobRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    template = await session.createTemplate();
    subscriberService = new SubscribersService(session.organization._id, session.environment._id);
    subscriber = await subscriberService.createSubscriber();
  });

  it('should generate logs for the notification', async function () {
    await axiosInstance.post(
      `${session.serverUrl}/v1/events/trigger`,
      {
        name: template.triggers[0].identifier,
        to: subscriber.subscriberId,
        payload: {
          firstName: 'Testing of User Name',
          urlVariable: '/test/url/path',
        },
      },
      {
        headers: {
          authorization: `ApiKey ${session.apiKey}`,
        },
      }
    );

    await session.awaitRunningJobs(template._id);

    await new Promise((resolve) => setTimeout(resolve, 100));
    const logs = await logRepository.find({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
    });

    expect(logs.length).to.be.gt(2);
  });

  it('should trigger an event successfully', async function () {
    const response = await axiosInstance.post(
      `${session.serverUrl}/v1/events/trigger`,
      {
        name: template.triggers[0].identifier,
        to: subscriber.subscriberId,
        payload: {
          firstName: 'Testing of User Name',
          urlVariable: '/test/url/path',
        },
      },
      {
        headers: {
          authorization: `ApiKey ${session.apiKey}`,
        },
      }
    );

    const { data: body } = response;

    expect(body.data).to.be.ok;
    expect(body.data.status).to.equal('processed');
    expect(body.data.acknowledged).to.equal(true);
  });

  it('should create a subscriber based on event', async function () {
    const subscriberId = SubscriberRepository.createObjectId();
    const payload: ISubscribersDefine = {
      subscriberId,
      firstName: 'Test Name',
      lastName: 'Last of name',
      email: 'test@email.novu',
    };
    const { data: body } = await axiosInstance.post(
      `${session.serverUrl}/v1/events/trigger`,
      {
        name: template.triggers[0].identifier,
        to: {
          ...payload,
        },
        payload: {
          urlVar: '/test/url/path',
        },
      },
      {
        headers: {
          authorization: `ApiKey ${session.apiKey}`,
        },
      }
    );

    const createdSubscriber = await subscriberRepository.findBySubscriberId(session.environment._id, subscriberId);

    expect(createdSubscriber.subscriberId).to.equal(subscriberId);
    expect(createdSubscriber.firstName).to.equal(payload.firstName);
    expect(createdSubscriber.lastName).to.equal(payload.lastName);
    expect(createdSubscriber.email).to.equal(payload.email);
  });

  it('should override subscriber email based on event data', async function () {
    const subscriberId = SubscriberRepository.createObjectId();
    const { data: body } = await axiosInstance.post(
      `${session.serverUrl}/v1/events/trigger`,
      {
        name: template.triggers[0].identifier,
        to: [
          { subscriberId: subscriber.subscriberId, email: 'gg@ff.com' },
          { subscriberId: subscriberId, email: 'gg@ff.com' },
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

    let jobs: JobEntity[] = await jobRepository.find({});
    let statuses: JobStatusEnum[] = jobs.map((job) => job.status);

    expect(statuses.includes(JobStatusEnum.RUNNING)).true;
    expect(statuses.includes(JobStatusEnum.PENDING)).true;

    await session.awaitRunningJobs(template._id);

    jobs = await jobRepository.find({
      _templateId: template._id,
    });
    statuses = jobs.map((job) => job.status).filter((value) => value !== JobStatusEnum.COMPLETED);

    expect(statuses.length).to.equal(0);

    const messages = await messageRepository.findBySubscriberChannel(
      session.environment._id,
      subscriber._id,
      ChannelTypeEnum.EMAIL
    );
    const createdSubscriber = await subscriberRepository.findBySubscriberId(session.environment._id, subscriberId);

    const messages2 = await messageRepository.findBySubscriberChannel(
      session.environment._id,
      createdSubscriber._id,
      ChannelTypeEnum.EMAIL
    );

    expect(subscriber.email).to.not.equal('new-test-email@gmail.com');
    expect(messages[0].email).to.equal('new-test-email@gmail.com');
  });

  it('should generate message and notification based on event', async function () {
    const { data: body } = await axiosInstance.post(
      `${session.serverUrl}/v1/events/trigger`,
      {
        name: template.triggers[0].identifier,
        to: {
          subscriberId: subscriber.subscriberId,
        },
        payload: {
          firstName: 'Testing of User Name',
          urlVar: '/test/url/path',
          attachments: [
            {
              name: 'text1.txt',
              file: 'hello world!',
            },
            {
              name: 'text2.txt',
              file: new Buffer('hello world!', 'utf-8'),
            },
          ],
        },
      },
      {
        headers: {
          authorization: `ApiKey ${session.apiKey}`,
        },
      }
    );

    await session.awaitRunningJobs(template._id);

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
    expect(Array.isArray(email.content)).to.be.ok;
    expect((email.content[0] as IEmailBlock).type).to.equal('text');
    expect((email.content[0] as IEmailBlock).content).to.equal(
      'This are the text contents of the template for Testing of User Name'
    );
  });

  it('should trigger SMS notification', async function () {
    template = await session.createTemplate({
      steps: [
        {
          type: ChannelTypeEnum.SMS,
          content: 'Hello world {{customVar}}' as string,
        },
      ],
    });

    const { data: body } = await axiosInstance.post(
      `${session.serverUrl}/v1/events/trigger`,
      {
        name: template.triggers[0].identifier,
        to: [subscriber.subscriberId],
        payload: {
          customVar: 'Testing of User Name',
        },
      },
      {
        headers: {
          authorization: `ApiKey ${session.apiKey}`,
        },
      }
    );

    await session.awaitRunningJobs(template._id);

    const message = await messageRepository._model.findOne({
      _environmentId: session.environment._id,
      _templateId: template._id,
      _subscriberId: subscriber._id,
      channel: ChannelTypeEnum.SMS,
    });

    expect(message.phone).to.equal(subscriber.phone);
  });

  it('should trigger SMS notification for all subscribers', async function () {
    const subscriberId = SubscriberRepository.createObjectId();
    template = await session.createTemplate({
      steps: [
        {
          type: ChannelTypeEnum.SMS,
          content: 'Welcome to {{organizationName}}' as string,
        },
      ],
    });

    const { data: body } = await axiosInstance.post(
      `${session.serverUrl}/v1/events/trigger`,
      {
        name: template.triggers[0].identifier,
        to: [{ subscriberId: subscriber.subscriberId }, { subscriberId: subscriberId, phone: '+972541111111' }],
        payload: {
          organizationName: 'Testing of Organization Name',
        },
      },
      {
        headers: {
          authorization: `ApiKey ${session.apiKey}`,
        },
      }
    );

    await session.awaitRunningJobs(template._id);

    const message = await messageRepository._model.findOne({
      _environmentId: session.environment._id,
      _templateId: template._id,
      _subscriberId: subscriber._id,
      channel: ChannelTypeEnum.SMS,
    });

    const createdSubscriber = await subscriberRepository.findBySubscriberId(session.environment._id, subscriberId);

    const message2 = await messageRepository._model.findOne({
      _environmentId: session.environment._id,
      _templateId: template._id,
      _subscriberId: createdSubscriber._id,
      channel: ChannelTypeEnum.SMS,
    });

    expect(message2.phone).to.equal('+972541111111');
  });

  it('should trigger an sms error', async function () {
    template = await session.createTemplate({
      steps: [
        {
          type: ChannelTypeEnum.SMS,
          content: 'Hello world {{firstName}}' as string,
        },
      ],
    });
    const { data: body } = await axiosInstance.post(
      `${session.serverUrl}/v1/events/trigger`,
      {
        name: template.triggers[0].identifier,
        to: subscriber.subscriberId,
        payload: {
          phone: '+972541111111',
          firstName: 'Testing of User Name',
        },
      },
      {
        headers: {
          authorization: `ApiKey ${session.apiKey}`,
        },
      }
    );

    await session.awaitRunningJobs(template._id);

    const message = await messageRepository._model.findOne({
      _environmentId: session.environment._id,
      _templateId: template._id,
      _subscriberId: subscriber._id,
    });

    expect(message.status).to.equal('error');
    expect(message.errorText).to.contains('Currently 3rd-party packages test are not support on test env');
  });

  it('should trigger In-App notification with subscriber data', async function () {
    const newSubscriberIdInAppNotification = SubscriberRepository.createObjectId();
    const channelType = ChannelTypeEnum.IN_APP;

    template = await createTemplate(session, channelType);

    await sendTrigger(session, template, newSubscriberIdInAppNotification);

    await session.awaitRunningJobs(template._id);

    const createdSubscriber = await subscriberRepository.findBySubscriberId(
      session.environment._id,
      newSubscriberIdInAppNotification
    );

    const message = await messageRepository.findOne({
      _environmentId: session.environment._id,
      _subscriberId: createdSubscriber._id,
      channel: channelType,
    });

    expect(message.content).to.equal('Hello Smith, Welcome to Umbrella Corp');
  });

  it('should trigger SMS notification with subscriber data', async function () {
    const newSubscriberIdInAppNotification = SubscriberRepository.createObjectId();
    const channelType = ChannelTypeEnum.SMS;

    template = await createTemplate(session, channelType);

    await sendTrigger(session, template, newSubscriberIdInAppNotification);

    await session.awaitRunningJobs(template._id);

    const createdSubscriber = await subscriberRepository.findBySubscriberId(
      session.environment._id,
      newSubscriberIdInAppNotification
    );

    const message = await messageRepository.findOne({
      _environmentId: session.environment._id,
      _subscriberId: createdSubscriber._id,
      channel: channelType,
    });

    expect(message.content).to.equal('Hello Smith, Welcome to Umbrella Corp');
  });

  it('should trigger E-Mail notification with subscriber data', async function () {
    const newSubscriberIdInAppNotification = SubscriberRepository.createObjectId();
    const channelType = ChannelTypeEnum.EMAIL;

    template = await createTemplate(session, channelType);

    template = await session.createTemplate({
      steps: [
        {
          name: 'Message Name',
          subject: 'Test email subject',
          type: ChannelTypeEnum.EMAIL,
          content: [
            {
              type: 'text',
              content: 'Hello {{subscriber.lastName}}, Welcome to {{organizationName}}' as string,
            },
          ],
        },
      ],
    });

    await sendTrigger(session, template, newSubscriberIdInAppNotification);

    await session.awaitRunningJobs(template._id);

    const createdSubscriber = await subscriberRepository.findBySubscriberId(
      session.environment._id,
      newSubscriberIdInAppNotification
    );

    const message = await messageRepository.findOne({
      _environmentId: session.environment._id,
      _subscriberId: createdSubscriber._id,
      channel: channelType,
    });

    const block = message.content[0] as IEmailBlock;

    expect(block.content).to.equal('Hello Smith, Welcome to Umbrella Corp');
  });
});

async function createTemplate(session, channelType) {
  return await session.createTemplate({
    steps: [
      {
        type: channelType,
        content: 'Hello {{subscriber.lastName}}, Welcome to {{organizationName}}' as string,
      },
    ],
  });
}

async function sendTrigger(session, template, newSubscriberIdInAppNotification: string) {
  await axiosInstance.post(
    `${session.serverUrl}/v1/events/trigger`,
    {
      name: template.triggers[0].identifier,
      to: [{ subscriberId: newSubscriberIdInAppNotification, lastName: 'Smith', email: 'test@email.novu' }],
      payload: {
        organizationName: 'Umbrella Corp',
      },
    },
    {
      headers: {
        authorization: `ApiKey ${session.apiKey}`,
      },
    }
  );
}
