import { Novu } from '@novu/api';
import {
  SubscriberPayloadDto,
  TopicPayloadDto,
  TopicResponseDto,
  TriggerEventRequestDto,
  TriggerRecipientsTypeEnum,
} from '@novu/api/models/components';
import {
  MessageRepository,
  NotificationRepository,
  NotificationTemplateEntity,
  PreferencesRepository,
  SubscriberEntity,
  TopicSubscribersRepository,
} from '@novu/dal';
import {
  ChannelTypeEnum,
  DigestTypeEnum,
  DigestUnitEnum,
  ExternalSubscriberId,
  IEmailBlock,
  PreferencesTypeEnum,
  StepTypeEnum,
  TopicKey,
  TopicName,
} from '@novu/shared';
import { SubscribersService, UserSession } from '@novu/testing';
import { expect } from 'chai';
import { initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Topic Trigger Event #novu-v2', () => {
  describe('Trigger event for a topic - /v1/events/trigger (POST)', () => {
    let session: UserSession;
    let template: NotificationTemplateEntity;
    let firstSubscriber: SubscriberEntity;
    let secondSubscriber: SubscriberEntity;
    let subscribers: SubscriberEntity[];
    let subscriberService: SubscribersService;
    let createdTopicDto: TopicResponseDto;
    let to: Array<TopicPayloadDto | SubscriberPayloadDto | string>;
    const notificationRepository = new NotificationRepository();
    const messageRepository = new MessageRepository();
    const preferencesRepository = new PreferencesRepository();
    const topicSubscribersRepository = new TopicSubscribersRepository();
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

      await session.waitForJobCompletion(template._id);

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

      await session.waitForJobCompletion(template._id);

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

    it('should exclude specific subscribers from topic using exclude array', async () => {
      const excludedSubscriber = firstSubscriber;
      const toWithExclude = [
        {
          type: TriggerRecipientsTypeEnum.Topic,
          topicKey: createdTopicDto.key,
          exclude: [excludedSubscriber.subscriberId],
        },
      ];

      await novuClient.trigger(buildTriggerRequestPayload(template, toWithExclude));

      await session.waitForJobCompletion(template._id);

      const excludedSubscriberNotifications = await notificationRepository.findBySubscriberId(
        session.environment._id,
        excludedSubscriber._id
      );
      expect(excludedSubscriberNotifications.length).to.equal(0);

      const excludedSubscriberMessages = await messageRepository.findBySubscriberChannel(
        session.environment._id,
        excludedSubscriber._id,
        ChannelTypeEnum.IN_APP
      );
      expect(excludedSubscriberMessages.length).to.equal(0);

      const excludedSubscriberEmails = await messageRepository.findBySubscriberChannel(
        session.environment._id,
        excludedSubscriber._id,
        ChannelTypeEnum.EMAIL
      );
      expect(excludedSubscriberEmails.length).to.equal(0);

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

    it('should exclude multiple subscribers from topic using exclude array', async () => {
      const toWithExclude = [
        {
          type: TriggerRecipientsTypeEnum.Topic,
          topicKey: createdTopicDto.key,
          exclude: [firstSubscriber.subscriberId, secondSubscriber.subscriberId],
        },
      ];

      await novuClient.trigger(buildTriggerRequestPayload(template, toWithExclude));

      await session.waitForJobCompletion(template._id);

      const firstSubscriberNotifications = await notificationRepository.findBySubscriberId(
        session.environment._id,
        firstSubscriber._id
      );
      expect(firstSubscriberNotifications.length).to.equal(0);

      const secondSubscriberNotifications = await notificationRepository.findBySubscriberId(
        session.environment._id,
        secondSubscriber._id
      );
      expect(secondSubscriberNotifications.length).to.equal(0);
    });

    it('should only exclude actor from topic, should send event if actor explicitly included', async () => {
      const actor = firstSubscriber;
      await novuClient.trigger({
        ...buildTriggerRequestPayload(template, [...to, actor.subscriberId]),
        actor: { subscriberId: actor.subscriberId },
      });

      await session.waitForJobCompletion(template._id);

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

      await session.waitForJobCompletion(template._id);

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

    it('should deliver only to subscriptions with passing conditions', async () => {
      const conditionsTopicKey = `topic-key-conditions-${Date.now()}`;

      const newSubscriber = await subscriberService.createSubscriber();
      await novuClient.topics.subscriptions.create(
        {
          subscriberIds: [newSubscriber.subscriberId],
          preferences: [
            {
              filter: {
                workflowIds: [template._id],
              },
              enabled: false,
              condition: {
                and: [
                  {
                    '==': [
                      {
                        var: 'payload.status',
                      },
                      'completed',
                    ],
                  },
                  {
                    '>': [
                      {
                        var: 'payload.price',
                      },
                      100,
                    ],
                  },
                ],
              },
            },
          ],
        } as any,
        conditionsTopicKey
      );

      await novuClient.topics.subscriptions.create(
        {
          subscriberIds: [secondSubscriber.subscriberId],
          preferences: [
            {
              filter: {
                workflowIds: [template._id],
              },
              enabled: false,
              condition: {
                '==': [
                  {
                    var: 'payload.status',
                  },
                  'failed',
                ],
              },
            },
          ],
        } as any,
        conditionsTopicKey
      );

      const toWithConditions = [{ type: TriggerRecipientsTypeEnum.Topic, topicKey: conditionsTopicKey }];

      await novuClient.trigger({
        workflowId: template.triggers[0].identifier,
        to: toWithConditions,
        payload: { status: 'completed', price: 150 },
      });

      await session.waitForJobCompletion(template._id);

      const passMessages = await messageRepository.find({
        _environmentId: session.environment._id,
        _subscriberId: newSubscriber._id,
        _templateId: template._id,
        channel: ChannelTypeEnum.IN_APP,
      });

      expect(passMessages.length, 'Passed Subscription Messages, expected to deliver the message').to.equal(1);

      await novuClient.trigger({
        workflowId: template.triggers[0].identifier,
        to: toWithConditions,
        payload: { status: 'not-completed', price: 150 },
      });

      await session.waitForJobCompletion(template._id);

      const filteredSubscriptionMessage = await messageRepository.find({
        _environmentId: session.environment._id,
        _subscriberId: newSubscriber._id,
        _templateId: template._id,
        channel: ChannelTypeEnum.IN_APP,
      });
      expect(
        filteredSubscriptionMessage.length,
        'Filtered Subscription Messages, expected to not deliver the message'
      ).to.equal(1);

      const secondSubscriberMessages = await messageRepository.find({
        _environmentId: session.environment._id,
        _subscriberId: secondSubscriber._id,
        _templateId: template._id,
        channel: ChannelTypeEnum.IN_APP,
      });

      expect(
        secondSubscriberMessages.length,
        'Second subscriber should not receive messages as condition did not match'
      ).to.equal(0);

      const booleanConditionTopicKey = `topic-key-boolean-conditions-${Date.now()}`;
      const booleanTrueSubscriber = await subscriberService.createSubscriber();
      const booleanFalseSubscriber = await subscriberService.createSubscriber();

      await novuClient.topics.subscriptions.create(
        {
          subscriberIds: [booleanTrueSubscriber.subscriberId],
          preferences: [
            {
              filter: {
                workflowIds: [template._id],
              },
              enabled: true,
            },
          ],
        } as any,
        booleanConditionTopicKey
      );

      await novuClient.topics.subscriptions.create(
        {
          subscriberIds: [booleanFalseSubscriber.subscriberId],
          preferences: [
            {
              filter: {
                workflowIds: [template._id],
              },
              enabled: false,
            },
          ],
        } as any,
        booleanConditionTopicKey
      );

      const toWithBooleanConditions = [{ type: TriggerRecipientsTypeEnum.Topic, topicKey: booleanConditionTopicKey }];

      await novuClient.trigger({
        workflowId: template.triggers[0].identifier,
        to: toWithBooleanConditions,
      });

      await session.waitForJobCompletion(template._id);

      const booleanTrueMessages = await messageRepository.find({
        _environmentId: session.environment._id,
        _subscriberId: booleanTrueSubscriber._id,
        _templateId: template._id,
        channel: ChannelTypeEnum.IN_APP,
      });

      expect(booleanTrueMessages.length, 'Enabled true - expected to deliver the message').to.equal(1);

      const booleanFalseMessages = await messageRepository.find({
        _environmentId: session.environment._id,
        _subscriberId: booleanFalseSubscriber._id,
        _templateId: template._id,
        channel: ChannelTypeEnum.IN_APP,
      });

      expect(booleanFalseMessages.length, 'Enabled false - expected to not deliver the message').to.equal(0);
    });

    it('should filter subscriptions by tags and combined workflow filters', async () => {
      const taggedTemplate = await session.createTemplate({
        tags: ['important', 'promotional'],
      });

      await session.createTemplate({
        tags: ['nonexistent-tag'],
      });

      const subscriberWithTagFilter = await subscriberService.createSubscriber();
      const subscriberWithCombinedFilter = await subscriberService.createSubscriber();
      const subscriberWithMisconfiguredTagFilter = await subscriberService.createSubscriber();

      const testCases = [
        {
          name: 'tag filter',
          topicKey: `topic-key-tag-filter-${Date.now()}`,
          subscriber: subscriberWithTagFilter,
          preferences: [
            {
              filter: { tags: ['important'] },
              condition: { '==': [{ var: 'payload.status' }, 'active'] },
            },
          ],
          triggerPayload: { status: 'active' },
          expectedMessageCount: 1,
          description: 'Tag filter should deliver when tag matches',
        },
        {
          name: 'combined filter',
          topicKey: `topic-key-combined-filter-${Date.now()}`,
          subscriber: subscriberWithCombinedFilter,
          preferences: [
            {
              filter: { workflowIds: [taggedTemplate._id], tags: ['promotional'] },
              enabled: true,
            },
          ],
          triggerPayload: {},
          expectedMessageCount: 1,
          description: 'Combined filter should deliver when both workflow ID and tag match',
        },
        {
          name: 'misconfigured tag filter',
          topicKey: `topic-key-misconfigured-tag-filter-${Date.now()}`,
          subscriber: subscriberWithMisconfiguredTagFilter,
          preferences: [
            {
              filter: { tags: ['nonexistent-tag'] },
              condition: { '==': [{ var: 'payload.status' }, 'active'] },
            },
          ],
          triggerPayload: { status: 'active' },
          expectedMessageCount: 1,
          description: 'Misconfigured tag filter should deliver, because we have global preferences.',
        },
      ];

      for (const testCase of testCases) {
        await novuClient.topics.subscriptions.create(
          {
            subscriberIds: [testCase.subscriber.subscriberId],
            preferences: testCase.preferences,
          } as any,
          testCase.topicKey
        );

        await novuClient.trigger({
          workflowId: taggedTemplate.triggers[0].identifier,
          to: [{ type: TriggerRecipientsTypeEnum.Topic, topicKey: testCase.topicKey }],
          payload: testCase.triggerPayload,
        });

        await session.waitForJobCompletion(taggedTemplate._id);

        const messages = await messageRepository.find({
          _environmentId: session.environment._id,
          _subscriberId: testCase.subscriber._id,
          _templateId: taggedTemplate._id,
          channel: ChannelTypeEnum.IN_APP,
        });

        expect(messages.length, testCase.description).to.equal(testCase.expectedMessageCount);
      }
    });

    it('should test subscription fallback to workflow preference', async () => {
      const tag = 'alert';
      const topicKey = `topic-key-dynamic-pref-${Date.now()}`;
      const subscriber = await subscriberService.createSubscriber();

      // Setup: Create initial workflow and topic subscription with tag filter
      const initialWorkflow = await session.createTemplate({ tags: [tag] });

      await novuClient.topics.subscriptions.create(
        {
          subscriberIds: [subscriber.subscriberId],
          preferences: [
            {
              filter: { tags: [tag] },
              enabled: true,
            },
          ],
        } as any,
        topicKey
      );

      const topicSubscription = await topicSubscribersRepository.findOne({
        _environmentId: session.environment._id,
        topicKey: topicKey,
        _subscriberId: subscriber._id,
      });
      if (!topicSubscription) throw new Error('Topic subscription not found');

      // Verify preference was created for the initial workflow
      const initialPreferences = await preferencesRepository.find({
        _environmentId: session.environment._id,
        _topicSubscriptionId: topicSubscription._id,
      });

      expect(initialPreferences.length).to.equal(1);
      expect(initialPreferences[0]._templateId?.toString()).to.equal(initialWorkflow._id);

      // Test: Create new workflow with same tag and verify fallback to workflow defaults (enabled)
      const newWorkflow = await session.createTemplate({
        tags: [tag],
        steps: [
          {
            type: StepTypeEnum.IN_APP,
            content: 'Test content for <b>{{firstName}}</b>',
          },
        ],
      });

      await novuClient.trigger({
        workflowId: newWorkflow.triggers[0].identifier,
        to: [{ type: TriggerRecipientsTypeEnum.Topic, topicKey: topicKey }],
        payload: { text: 'test message' },
      });
      await session.waitForJobCompletion(newWorkflow._id);
      const messagesAfterFirstTrigger = await messageRepository.find({
        _environmentId: session.environment._id,
        _templateId: newWorkflow._id,
        _subscriberId: subscriber._id,
      });

      expect(messagesAfterFirstTrigger.length).to.equal(1);

      // Test: Disable workflow preferences and verify fallback respects disabled state
      const workflowPreference = await preferencesRepository.findOne({
        _templateId: newWorkflow._id,
        _environmentId: session.environment._id,
        type: PreferencesTypeEnum.USER_WORKFLOW,
      });
      if (!workflowPreference) throw new Error('Workflow preference should exist');
      const disabledPreferences = {
        all: { enabled: false },
        channels: {
          [ChannelTypeEnum.EMAIL]: { enabled: false },
          [ChannelTypeEnum.SMS]: { enabled: false },
          [ChannelTypeEnum.IN_APP]: { enabled: false },
          [ChannelTypeEnum.CHAT]: { enabled: false },
          [ChannelTypeEnum.PUSH]: { enabled: false },
        },
      };
      await preferencesRepository.update(
        {
          _id: workflowPreference._id,
          _environmentId: session.environment._id,
        },
        { $set: { preferences: disabledPreferences } }
      );

      await novuClient.trigger({
        workflowId: newWorkflow.triggers[0].identifier,
        to: [{ type: TriggerRecipientsTypeEnum.Topic, topicKey: topicKey }],
        payload: { text: 'test message 2' },
      });
      await session.waitForJobCompletion(newWorkflow._id);
      const messagesAfterDisabledWorkflow = await messageRepository.find({
        _environmentId: session.environment._id,
        _templateId: newWorkflow._id,
        _subscriberId: subscriber._id,
      });
      expect(messagesAfterDisabledWorkflow.length, 'Should have 1 message after disabled workflow').to.equal(1);

      // Test: Update subscription to create explicit preference and verify it overrides workflow defaults
      await novuClient.topics.subscriptions.update({
        topicKey,
        identifier: topicSubscription.identifier,
        updateTopicSubscriptionRequestDto: {
          preferences: [
            {
              filter: { tags: [tag] },
              enabled: true,
            },
          ],
        },
      });
      const preferencesAfterUpdate = await preferencesRepository.find({
        _environmentId: session.environment._id,
        _topicSubscriptionId: topicSubscription._id,
      });
      expect(preferencesAfterUpdate.length, 'Should have 2 preferences after update').to.equal(2);

      // Re-enable workflow preferences to allow final trigger to succeed
      await preferencesRepository.update(
        {
          _id: workflowPreference._id,
          _environmentId: session.environment._id,
        },
        {
          $set: {
            preferences: {
              all: { enabled: true },
              channels: {
                [ChannelTypeEnum.EMAIL]: { enabled: true },
                [ChannelTypeEnum.SMS]: { enabled: true },
                [ChannelTypeEnum.IN_APP]: { enabled: true },
                [ChannelTypeEnum.CHAT]: { enabled: true },
                [ChannelTypeEnum.PUSH]: { enabled: true },
              },
            },
          },
        }
      );

      await novuClient.trigger({
        workflowId: newWorkflow.triggers[0].identifier,
        to: [{ type: TriggerRecipientsTypeEnum.Topic, topicKey: topicKey }],
        payload: { text: 'test message 3' },
      });
      await session.waitForJobCompletion(newWorkflow._id);
      const messagesAfterFinalTrigger = await messageRepository.find({
        _environmentId: session.environment._id,
        _templateId: newWorkflow._id,
        _subscriberId: subscriber._id,
      });

      expect(messagesAfterFinalTrigger.length, 'Should have 2 messages after final trigger').to.equal(2);
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
    let firstTopicDto: TopicResponseDto;
    let secondTopicDto: TopicResponseDto;
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
      const localTo = [...to, { type: TriggerRecipientsTypeEnum.Topic, topicKey: 'non-existing-topic-key' }];
      const response = await novuClient.trigger(buildTriggerRequestPayload(template, localTo));

      await session.waitForJobCompletion(template._id);

      const body = response.result;

      expect(body).to.be.ok;
      expect(body.status).to.equal('processed');
      expect(body.acknowledged).to.equal(true);
      expect(body.transactionId).to.exist;

      const messageCount = await messageRepository.count({
        _environmentId: session.environment._id,
        transactionId: body.transactionId,
      });

      expect(messageCount).to.equal(12);
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

      await session.waitForJobCompletion(template._id);
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

      await session.waitForJobCompletion(template._id);

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
              amount: 1,
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

      await session.waitForJobCompletion(template._id);

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

const createTopic = async (session: UserSession, key: TopicKey, name: TopicName): Promise<TopicResponseDto> => {
  const response = await initNovuClassSdk(session).topics.create({ key, name });

  expect(response.result.id).to.exist;
  expect(response.result.key).to.eql(key);

  return response.result;
};

const addSubscribersToTopic = async (
  session: UserSession,
  createdTopicDto: TopicResponseDto,
  subscribers: SubscriberEntity[]
) => {
  const subscriberIds: ExternalSubscriberId[] = subscribers.map(
    (subscriber: SubscriberEntity) => subscriber.subscriberId
  );

  const response = await initNovuClassSdk(session).topics.subscriptions.create(
    {
      subscriberIds,
    },
    createdTopicDto.key
  );

  expect(response.result.data).to.be.ok;
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
