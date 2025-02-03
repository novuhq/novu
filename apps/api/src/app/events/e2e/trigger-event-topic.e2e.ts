import { MessageRepository, NotificationRepository, NotificationTemplateEntity, SubscriberEntity } from '@novu/dal';
import {
  ChannelTypeEnum,
  DigestTypeEnum,
  DigestUnitEnum,
  ExternalSubscriberId,
  IEmailBlock,
  StepTypeEnum,
  TopicKey,
  TopicName,
} from '@novu/shared';
import { SubscribersService, UserSession } from '@novu/testing';
import { expect } from 'chai';

import { Novu } from '@novu/api';
import {
  CreateTopicResponseDto,
  SubscriberPayloadDto,
  TopicPayloadDto,
  TriggerEventRequestDto,
  TriggerRecipientsTypeEnum,
} from '@novu/api/models/components';
import { initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Topic Trigger Event #novu-v2', () => {
  describe('Trigger event for a topic - /v1/events/trigger (POST)', () => {
    let session: UserSession;
    let template: NotificationTemplateEntity;
    let firstSubscriber: SubscriberEntity;
    let secondSubscriber: SubscriberEntity;
    let subscribers: SubscriberEntity[];
    let subscriberService: SubscribersService;
    let createdTopicDto: CreateTopicResponseDto;
    let to: Array<TopicPayloadDto | SubscriberPayloadDto | string>;
    const notificationRepository = new NotificationRepository();
    const messageRepository = new MessageRepository();
    let novuClient: Novu;

    beforeEach(async () => {
      session = new UserSession();
      await session.initialize();

      template = await session.createTemplate();
      subscriberService = new SubscribersService(session.organization._id, session.environment._id);
      firstSubscriber = await subscriberService.createSubscriber();
      secondSubscriber = await subscriberService.createSubscriber();
      subscribers = [firstSubscriber, secondSubscriber];

      const topicKey = 'topic-key-trigger-event';
      const topicName = 'topic-name-trigger-event';
      createdTopicDto = await createTopic(session, topicKey, topicName);
      await addSubscribersToTopic(session, createdTopicDto, subscribers);
      to = [{ type: TriggerRecipientsTypeEnum.Topic, topicKey: createdTopicDto.key }];
      novuClient = initNovuClassSdk(session);
    });

    it('should trigger an event successfully', async () => {
      const response = await novuClient.trigger(buildTriggerRequestPayload(template, to));

      const body = response.result;

      expect(body).to.be.ok;
      expect(body.status).to.equal('processed');
      expect(body.acknowledged).to.equal(true);
      expect(body.transactionId).to.exist;
    });

    it('should generate message and notification based on event', async () => {
      const attachments = [
        {
          name: 'text1.txt',
          file: 'hello world!',
        },
        {
          name: 'text2.txt',
          file: Buffer.from('hello world!', 'utf-8'),
        },
      ];

      await novuClient.trigger(buildTriggerRequestPayload(template, to, attachments));

      await session.awaitRunningJobs(template._id);

      expect(subscribers.length).to.be.greaterThan(0);

      for (const subscriber of subscribers) {
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
        expect(message.payload.urlVariable).to.equal('/test/url/path');
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
      }
    });

    it('should exclude actor from topic events trigger', async () => {
      const actor = firstSubscriber;
      await novuClient.trigger({
        ...buildTriggerRequestPayload(template, to),
        actor: { subscriberId: actor.subscriberId },
      });

      await session.awaitRunningJobs(template._id);

      const actorNotifications = await notificationRepository.findBySubscriberId(session.environment._id, actor._id);
      expect(actorNotifications.length).to.equal(0);

      const actorMessages = await messageRepository.findBySubscriberChannel(
        session.environment._id,
        actor._id,
        ChannelTypeEnum.IN_APP
      );

      expect(actorMessages.length).to.equal(0);

      const actorEmails = await messageRepository.findBySubscriberChannel(
        session.environment._id,
        actor._id,
        ChannelTypeEnum.EMAIL
      );
      expect(actorEmails.length).to.equal(0);

      const secondSubscriberNotifications = await notificationRepository.findBySubscriberId(
        session.environment._id,
        secondSubscriber._id
      );

      expect(secondSubscriberNotifications.length).to.equal(1);

      const secondSubscriberMessages = await messageRepository.findBySubscriberChannel(
        session.environment._id,
        secondSubscriber._id,
        ChannelTypeEnum.IN_APP
      );

      expect(secondSubscriberMessages.length).to.equal(1);

      const secondSubscriberEmails = await messageRepository.findBySubscriberChannel(
        session.environment._id,
        secondSubscriber._id,
        ChannelTypeEnum.EMAIL
      );

      expect(secondSubscriberEmails.length).to.equal(1);
    });

    it('should only exclude actor from topic, should send event if actor explicitly included', async () => {
      const actor = firstSubscriber;
      await novuClient.trigger({
        ...buildTriggerRequestPayload(template, [...to, actor.subscriberId]),
        actor: { subscriberId: actor.subscriberId },
      });

      await session.awaitRunningJobs(template._id);

      for (const subscriber of subscribers) {
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
        expect(message.payload.urlVariable).to.equal('/test/url/path');
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
      }
    });

    it('should trigger SMS notification', async () => {
      template = await session.createTemplate({
        steps: [
          {
            type: StepTypeEnum.SMS,
            content: 'Hello world {{customVar}}' as string,
          },
        ],
      });

      await novuClient.trigger(buildTriggerRequestPayload(template, to));

      await session.awaitRunningJobs(template._id);

      expect(subscribers.length).to.be.greaterThan(0);

      for (const subscriber of subscribers) {
        const message = await messageRepository._model.findOne({
          _environmentId: session.environment._id,
          _templateId: template._id,
          _subscriberId: subscriber._id,
          channel: ChannelTypeEnum.SMS,
        });

        expect(message?._subscriberId.toString()).to.be.eql(subscriber._id);
        expect(message?.phone).to.equal(subscriber.phone);
      }
    });
  });

  describe('Trigger event for multiple topics and multiple subscribers - /v1/events/trigger (POST)', () => {
    let session: UserSession;
    let template: NotificationTemplateEntity;
    let firstSubscriber: SubscriberEntity;
    let secondSubscriber: SubscriberEntity;
    let thirdSubscriber: SubscriberEntity;
    let fourthSubscriber: SubscriberEntity;
    let fifthSubscriber: SubscriberEntity;
    let sixthSubscriber: SubscriberEntity;
    let firstTopicSubscribers: SubscriberEntity[];
    let subscribers: SubscriberEntity[];
    let subscriberService: SubscribersService;
    let firstTopicDto: CreateTopicResponseDto;
    let secondTopicDto: CreateTopicResponseDto;
    let to: Array<TopicPayloadDto | SubscriberPayloadDto | string>;
    const notificationRepository = new NotificationRepository();
    const messageRepository = new MessageRepository();
    let novuClient: Novu;

    beforeEach(async () => {
      session = new UserSession();
      await session.initialize();

      template = await session.createTemplate();
      subscriberService = new SubscribersService(session.organization._id, session.environment._id);
      firstSubscriber = await subscriberService.createSubscriber();
      secondSubscriber = await subscriberService.createSubscriber();
      firstTopicSubscribers = [firstSubscriber, secondSubscriber];

      const firstTopicKey = 'topic-key-1-trigger-event';
      const firstTopicName = 'topic-name-1-trigger-event';
      firstTopicDto = await createTopic(session, firstTopicKey, firstTopicName);

      await addSubscribersToTopic(session, firstTopicDto, firstTopicSubscribers);

      thirdSubscriber = await subscriberService.createSubscriber();
      fourthSubscriber = await subscriberService.createSubscriber();
      const secondTopicSubscribers = [thirdSubscriber, fourthSubscriber];

      const secondTopicKey = 'topic-key-2-trigger-event';
      const secondTopicName = 'topic-name-2-trigger-event';
      secondTopicDto = await createTopic(session, secondTopicKey, secondTopicName);

      await addSubscribersToTopic(session, secondTopicDto, secondTopicSubscribers);

      fifthSubscriber = await subscriberService.createSubscriber();
      sixthSubscriber = await subscriberService.createSubscriber();

      subscribers = [
        firstSubscriber,
        secondSubscriber,
        thirdSubscriber,
        fourthSubscriber,
        fifthSubscriber,
        sixthSubscriber,
      ];
      to = [
        { type: TriggerRecipientsTypeEnum.Topic, topicKey: firstTopicDto.key },
        { type: TriggerRecipientsTypeEnum.Topic, topicKey: secondTopicDto.key },
        fifthSubscriber.subscriberId,
        {
          subscriberId: sixthSubscriber.subscriberId,
          firstName: 'Subscribers',
          lastName: 'Define',
          email: 'subscribers-define@email.novu',
        },
      ];
      novuClient = initNovuClassSdk(session);
    });

    it('should trigger an event successfully', async () => {
      const response = await novuClient.trigger(buildTriggerRequestPayload(template, to));

      const body = response.result;

      expect(body).to.be.ok;
      expect(body.status).to.equal('processed');
      expect(body.acknowledged).to.equal(true);
      expect(body.transactionId).to.exist;
    });

    it('should generate message and notification based on event', async () => {
      const attachments = [
        {
          name: 'text1.txt',
          file: 'hello world!',
        },
        {
          name: 'text2.txt',
          file: Buffer.from('hello world!', 'utf-8'),
        },
      ];

      await novuClient.trigger(buildTriggerRequestPayload(template, to, attachments));

      await session.awaitRunningJobs(template._id);
      expect(subscribers.length).to.be.greaterThan(0);

      for (const subscriber of subscribers) {
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
        expect(message.payload.urlVariable).to.equal('/test/url/path');
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
      }
    });

    it('should trigger SMS notification', async () => {
      template = await session.createTemplate({
        steps: [
          {
            type: StepTypeEnum.SMS,
            content: 'Hello world {{customVar}}' as string,
          },
        ],
      });

      await novuClient.trigger(buildTriggerRequestPayload(template, to));

      await session.awaitRunningJobs(template._id);

      expect(subscribers.length).to.be.greaterThan(0);

      for (const subscriber of subscribers) {
        const message = await messageRepository._model.findOne({
          _environmentId: session.environment._id,
          _templateId: template._id,
          _subscriberId: subscriber._id,
          channel: ChannelTypeEnum.SMS,
        });

        expect(message?._subscriberId.toString()).to.be.eql(subscriber._id);
        expect(message?.phone).to.equal(subscriber.phone);
      }
    });

    it('should not contain events from a different digestKey ', async () => {
      template = await session.createTemplate({
        steps: [
          {
            type: StepTypeEnum.DIGEST,
            content: '',
            metadata: {
              unit: DigestUnitEnum.SECONDS,
              amount: 5,
              digestKey: 'id',
              type: DigestTypeEnum.REGULAR,
            },
          },
          {
            type: StepTypeEnum.IN_APP,
            content: '{{#each step.events}}{{id}} {{/each}}' as string,
          },
        ],
      });
      const toFirstTopic = [{ type: TriggerRecipientsTypeEnum.Topic, topicKey: firstTopicDto.key }];

      await triggerEvent(session, template, toFirstTopic, {
        id: 'key-1',
      });
      await triggerEvent(session, template, toFirstTopic, {
        id: 'key-1',
      });
      await triggerEvent(session, template, toFirstTopic, {
        id: 'key-1',
      });
      await triggerEvent(session, template, toFirstTopic, {
        id: 'key-2',
      });
      await triggerEvent(session, template, toFirstTopic, {
        id: 'key-2',
      });
      await triggerEvent(session, template, toFirstTopic, {
        id: 'key-2',
      });

      await session.awaitRunningJobs(template?._id, false, 0);

      for (const subscriber of firstTopicSubscribers) {
        const messages = await messageRepository.findBySubscriberChannel(
          session.environment._id,
          subscriber._id,
          ChannelTypeEnum.IN_APP
        );
        expect(messages.length).to.equal(2);
        for (const message of messages) {
          const digestKey = message.payload.id;
          expect(message.content).to.equal(`${digestKey} ${digestKey} ${digestKey} `);
        }
      }
    });
  });
});

const createTopic = async (session: UserSession, key: TopicKey, name: TopicName): Promise<CreateTopicResponseDto> => {
  const response = await initNovuClassSdk(session).topics.create({ key, name });

  expect(response.result.id).to.exist;
  expect(response.result.key).to.eql(key);

  return response.result;
};

const addSubscribersToTopic = async (
  session: UserSession,
  createdTopicDto: CreateTopicResponseDto,
  subscribers: SubscriberEntity[]
) => {
  const subscriberIds: ExternalSubscriberId[] = subscribers.map(
    (subscriber: SubscriberEntity) => subscriber.subscriberId
  );

  const response = await initNovuClassSdk(session).topics.subscribers.assign(
    {
      subscribers: subscriberIds,
    },
    createdTopicDto.key
  );

  expect(response.result.succeeded).to.have.members(subscriberIds);
};

const buildTriggerRequestPayload = (
  template: NotificationTemplateEntity,
  to: (string | TopicPayloadDto | SubscriberPayloadDto)[],
  attachments?: Record<string, unknown>[]
): TriggerEventRequestDto => {
  return {
    workflowId: template.triggers[0].identifier,
    to,
    payload: {
      firstName: 'Testing of User Name',
      urlVariable: '/test/url/path',
      ...(attachments && { attachments }),
    },
  };
};

const triggerEvent = async (
  session: UserSession,
  template: NotificationTemplateEntity,
  to: (string | TopicPayloadDto | SubscriberPayloadDto)[],
  payload: Record<string, unknown> = {}
): Promise<void> => {
  await initNovuClassSdk(session).trigger({
    workflowId: template.triggers[0].identifier,
    to,
    payload,
  });
};
