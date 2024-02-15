import { expect } from 'chai';
import * as sinon from 'sinon';
import { Test } from '@nestjs/testing';
import axios from 'axios';

import { SubscribersService, UserSession } from '@novu/testing';
import {
  ExternalSubscriberId,
  ISubscribersDefine,
  SubscriberSourceEnum,
  TopicId,
  TopicKey,
  TriggerRecipients,
  TriggerRecipientsTypeEnum,
} from '@novu/shared';
import { SubscriberProcessQueueService, TriggerMulticast, TriggerMulticastCommand } from '@novu/application-generic';
import { NotificationTemplateEntity, SubscriberEntity } from '@novu/dal';

import { SharedModule } from '../../shared/shared.module';
import { EventsModule } from '../events.module';
import { createTopic } from '../../topics/e2e/helpers';

const axiosInstance = axios.create();

const TOPIC_PATH = '/v1/topics';
const TOPIC_KEY_PREFIX = 'topic-key-trigger-event_';
const TOPIC_NAME_PREFIX = 'topic-name-trigger-event_';

export class MockSubscriberProcessQueueService {
  addBulk() {}
}

function mapSubscriberToSubscriberDefine(firstTopicSubscribers: SubscriberEntity[]) {
  return firstTopicSubscribers.map((subscriber) => ({ subscriberId: subscriber.subscriberId }));
}

describe('TriggerMulticast', () => {
  let triggerMulticast: TriggerMulticast;
  let subscriberProcessQueueService: SubscriberProcessQueueService;
  let sendToProcessSubscriberServiceStub: sinon.SinonStub;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SharedModule, EventsModule],
      providers: [
        // SubscriberProcessQueueService,
        TriggerMulticast,
        {
          provide: SubscriberProcessQueueService,
          useClass: MockSubscriberProcessQueueService,
        },
      ],
    }).compile();

    triggerMulticast = moduleRef.get<TriggerMulticast>(TriggerMulticast);
    subscriberProcessQueueService = moduleRef.get<SubscriberProcessQueueService>(SubscriberProcessQueueService);
    sendToProcessSubscriberServiceStub = sinon.stub(triggerMulticast, 'sendToProcessSubscriberService');
  });

  afterEach(() => {
    sendToProcessSubscriberServiceStub.restore(); // Restore the original method after each test
  });

  describe('E2E tests', () => {
    let session: UserSession;
    let template: NotificationTemplateEntity;
    let firstSubscriber: SubscriberEntity;
    let secondSubscriber: SubscriberEntity;
    let thirdSubscriber: SubscriberEntity;
    let forthSubscriber: SubscriberEntity;
    let subscriberService: SubscribersService;
    let bootstrapFirstTopic: { _id: TopicId; key: TopicKey };
    let bootstrapSecondTopic: { _id: TopicId; key: TopicKey };
    let to: TriggerRecipients;
    let firstTopicSubscribers: SubscriberEntity[];
    let secondTopicSubscribers: SubscriberEntity[];

    async function initializeTopic(subscribersToAdd: SubscriberEntity[], topicIndex: string) {
      const firstTopicKey = TOPIC_KEY_PREFIX + topicIndex;
      const firstTopicName = TOPIC_NAME_PREFIX + topicIndex;
      const createdTopic: { _id: TopicId; key: TopicKey } = await createTopic(session, firstTopicKey, firstTopicName);
      await addSubscribersToTopic(session, createdTopic, subscribersToAdd);

      return createdTopic;
    }
    beforeEach(async () => {
      process.env.LAUNCH_DARKLY_SDK_KEY = '';
      process.env.IS_TOPIC_NOTIFICATION_ENABLED = 'true';
      session = new UserSession();
      await session.initialize();
      template = await session.createTemplate();
      subscriberService = new SubscribersService(session.organization._id, session.environment._id);

      firstSubscriber = await subscriberService.createSubscriber();
      secondSubscriber = await subscriberService.createSubscriber();
      firstTopicSubscribers = [firstSubscriber, secondSubscriber];
      bootstrapFirstTopic = await initializeTopic(firstTopicSubscribers, '1');
      to = [{ type: TriggerRecipientsTypeEnum.TOPIC, topicKey: TOPIC_KEY_PREFIX + '1' }];

      thirdSubscriber = await subscriberService.createSubscriber();
      forthSubscriber = await subscriberService.createSubscriber();
      secondTopicSubscribers = [thirdSubscriber, forthSubscriber];
      bootstrapSecondTopic = await initializeTopic(secondTopicSubscribers, '2');
    });

    it('should call subscriberProcessQueueService with correct parameters', async () => {
      const command: TriggerMulticastCommand = triggerMulticastCommandMock as any;

      const subscribers: ISubscribersDefine[] = [{ subscriberId: command.to[0] }];

      await triggerMulticast.execute(command);

      expect(sendToProcessSubscriberServiceStub.calledWith(command, subscribers, command.requestCategory)).to.equal(
        true
      );
    });

    it('should fail on if provided topic key is not exists', async () => {
      const invalidTopicKey = 'none_existing_topic_key';
      const command: TriggerMulticastCommand = buildTriggerMulticastCommandMock({
        to: [...to, { type: TriggerRecipientsTypeEnum.TOPIC, topicKey: invalidTopicKey }],
        organizationId: session.organization._id,
        environmentId: session.environment._id,
        userId: session.user._id,
      }) as any;

      const res = await getErrorMessage(async () => await triggerMulticast.execute(command));

      expect(res).to.be.equal('Topic with key none_existing_topic_key not found in current environment');
    });

    it('should send only single subscribers forward to to processing', async () => {
      const singleSubscribers = firstTopicSubscribers;
      const command: TriggerMulticastCommand = buildTriggerMulticastCommandMock({
        to: singleSubscribers,
        organizationId: session.organization._id,
        environmentId: session.environment._id,
        userId: session.user._id,
      }) as any;

      await triggerMulticast.execute(command);

      expect(sendToProcessSubscriberServiceStub.called).to.be.true;

      expect(
        sendToProcessSubscriberServiceStub
          .getCall(0)
          .calledWith(command, singleSubscribers, SubscriberSourceEnum.SINGLE)
      ).to.be.true;

      expect(sendToProcessSubscriberServiceStub.callCount).to.be.equal(1);
    });

    it('should fan-out only subscriber from topic forward to to processing', async () => {
      const firstTopic: TriggerRecipients = [
        { type: TriggerRecipientsTypeEnum.TOPIC, topicKey: TOPIC_KEY_PREFIX + '1' },
      ];
      const subscribersDefine = mapSubscriberToSubscriberDefine(firstTopicSubscribers);
      const command: TriggerMulticastCommand = buildTriggerMulticastCommandMock({
        to: firstTopic,
        organizationId: session.organization._id,
        environmentId: session.environment._id,
        userId: session.user._id,
      }) as any;

      await triggerMulticast.execute(command);

      expect(sendToProcessSubscriberServiceStub.called).to.be.true;

      expect(sendToProcessSubscriberServiceStub.getCall(0).calledWith(command, [], SubscriberSourceEnum.SINGLE)).to.be
        .true;

      // we check second call because the first call is for the single subscriber
      expect(
        sendToProcessSubscriberServiceStub.getCall(1).calledWith(command, subscribersDefine, SubscriberSourceEnum.TOPIC)
      ).to.be.true;
    });

    it('should send single subscribers and fan-out subscriber from topic forward to to processing', async () => {
      const singleSubscribers = secondTopicSubscribers;
      const firstTopic: TriggerRecipients = [
        { type: TriggerRecipientsTypeEnum.TOPIC, topicKey: TOPIC_KEY_PREFIX + '1' },
      ];
      const command: TriggerMulticastCommand = buildTriggerMulticastCommandMock({
        to: [...singleSubscribers, ...firstTopic],
        organizationId: session.organization._id,
        environmentId: session.environment._id,
        userId: session.user._id,
      }) as any;
      const firstTopicSubscribersDefine = mapSubscriberToSubscriberDefine(firstTopicSubscribers);

      await triggerMulticast.execute(command);

      expect(sendToProcessSubscriberServiceStub.called).to.be.true;

      expect(
        sendToProcessSubscriberServiceStub
          .getCall(0)
          .calledWith(command, singleSubscribers, SubscriberSourceEnum.SINGLE)
      ).to.be.true;

      const secondCallStubArgs = sendToProcessSubscriberServiceStub.getCall(1).args;
      expect(secondCallStubArgs[0]).to.deep.equal(command);
      expect(secondCallStubArgs[1]).to.include.deep.members(firstTopicSubscribersDefine);
      expect(secondCallStubArgs[2]).to.be.equal(SubscriberSourceEnum.TOPIC);
    });

    it('should exclude the actor from the topic fan-out', async () => {
      const actor = firstSubscriber;
      const firstTopic: TriggerRecipients = [
        { type: TriggerRecipientsTypeEnum.TOPIC, topicKey: TOPIC_KEY_PREFIX + '1' },
      ];
      const subscribersDefine = mapSubscriberToSubscriberDefine(firstTopicSubscribers);
      const command: TriggerMulticastCommand = buildTriggerMulticastCommandMock({
        to: [...firstTopic],
        organizationId: session.organization._id,
        environmentId: session.environment._id,
        userId: session.user._id,
        actor: actor,
      }) as any;

      await triggerMulticast.execute(command);

      expect(sendToProcessSubscriberServiceStub.called).to.be.true;

      const topicSubscribersWithoutActor = subscribersDefine.filter(
        (subscriber) => subscriber.subscriberId !== actor.subscriberId
      );

      // we check second call because the first call is for the single subscriber
      expect(
        sendToProcessSubscriberServiceStub
          .getCall(1)
          .calledWith(command, topicSubscribersWithoutActor, SubscriberSourceEnum.TOPIC)
      ).to.be.true;
    });

    it('should deduplicate single subscriber from topic fan-out', async () => {
      const singleSubscribers = firstTopicSubscribers;
      const newSubscriber = await subscriberService.createSubscriber();
      await addSubscribersToTopic(session, bootstrapFirstTopic, [newSubscriber]);

      /*
       * in this case we send the same subscriber twice,
       * but the newSubscriber that is not duplicated and should be sent only once by topic
       * singleSubscribers contains: A, B
       * firstTopic contains: A, B, newSubscriber
       */
      const firstTopic: TriggerRecipients = [
        { type: TriggerRecipientsTypeEnum.TOPIC, topicKey: TOPIC_KEY_PREFIX + '1' },
      ];
      const command: TriggerMulticastCommand = buildTriggerMulticastCommandMock({
        to: [...singleSubscribers, ...firstTopic],
        organizationId: session.organization._id,
        environmentId: session.environment._id,
        userId: session.user._id,
      }) as any;

      await triggerMulticast.execute(command);

      expect(sendToProcessSubscriberServiceStub.called).to.be.true;

      expect(
        sendToProcessSubscriberServiceStub
          .getCall(0)
          .calledWith(command, singleSubscribers, SubscriberSourceEnum.SINGLE)
      ).to.be.true;

      const newSubscriberDefine = mapSubscriberToSubscriberDefine([newSubscriber]);
      const secondCallStubArgs = sendToProcessSubscriberServiceStub.getCall(1).args;
      expect(secondCallStubArgs[0]).to.deep.equal(command);
      expect(secondCallStubArgs[1]).to.include.deep.members(newSubscriberDefine);
      expect(secondCallStubArgs[2]).to.be.equal(SubscriberSourceEnum.TOPIC);
    });

    it('should deduplicate subscribers across topics', async () => {
      // first topic: subscribers A, B
      const firstTopic: TriggerRecipients = [
        { type: TriggerRecipientsTypeEnum.TOPIC, topicKey: TOPIC_KEY_PREFIX + '1' },
      ];

      // second topic: subscribers B, D
      const secondTopic: TriggerRecipients = [
        { type: TriggerRecipientsTypeEnum.TOPIC, topicKey: TOPIC_KEY_PREFIX + '2' },
      ];

      /*
       * add subscribers to second topic from first topic ,
       * now second topic subscribers are not duplicated with first topic subscribers (A, B, C, D)
       */
      await addSubscribersToTopic(session, bootstrapFirstTopic, firstTopicSubscribers);

      /*
       * in this case we send the same subscriber twice,
       * but the newSubscriber that is not duplicated and should be sent only once by topic
       * singleSubscribers contains: A, B
       * firstTopic contains: A, B
       */
      const command: TriggerMulticastCommand = buildTriggerMulticastCommandMock({
        to: [...firstTopic, ...secondTopic],
        organizationId: session.organization._id,
        environmentId: session.environment._id,
        userId: session.user._id,
      }) as any;

      await triggerMulticast.execute(command);

      expect(sendToProcessSubscriberServiceStub.called).to.be.true;

      const singleSubscribersDefine = mapSubscriberToSubscriberDefine(firstTopicSubscribers);

      const firstCallStubArgs = sendToProcessSubscriberServiceStub.getCall(0).args;
      expect(firstCallStubArgs[0]).to.deep.equal(command);
      expect(firstCallStubArgs[1]).to.include.deep.members([]);
      expect(firstCallStubArgs[2]).to.be.equal(SubscriberSourceEnum.SINGLE);

      // we check by second topic subscribers without duplication
      const secondTopicSubscriberDefine = mapSubscriberToSubscriberDefine(secondTopicSubscribers);

      const secondCallStubArgs = sendToProcessSubscriberServiceStub.getCall(1).args;
      expect(secondCallStubArgs[0]).to.deep.equal(command);
      expect(secondCallStubArgs[1]).to.include.deep.members(secondTopicSubscriberDefine);
      expect(secondCallStubArgs[2]).to.be.equal(SubscriberSourceEnum.TOPIC);
    });

    it('should deduplicate subscribers across single subscribers and topics', async () => {
      const newSubscriber = await subscriberService.createSubscriber();
      await addSubscribersToTopic(session, bootstrapFirstTopic, [newSubscriber]);

      // first topic: subscribers A, B
      const firstTopic: TriggerRecipients = [
        { type: TriggerRecipientsTypeEnum.TOPIC, topicKey: TOPIC_KEY_PREFIX + '1' },
      ];

      // second topic: subscribers B, D
      const secondTopic: TriggerRecipients = [
        { type: TriggerRecipientsTypeEnum.TOPIC, topicKey: TOPIC_KEY_PREFIX + '2' },
      ];

      /*
       * add subscribers to second topic from first topic ,
       * now second topic subscribers are not duplicated with first topic subscribers (A, B, C, D)
       */
      await addSubscribersToTopic(session, bootstrapFirstTopic, firstTopicSubscribers);

      const singleSubscribers = firstTopicSubscribers;
      /*
       * in this case we send the same subscriber twice,
       * but the newSubscriber that is not duplicated and should be sent only once by topic
       * singleSubscribers contains: A, B
       * firstTopic contains: A, B
       * secondTopic contains: A, B, C, D
       */
      const command: TriggerMulticastCommand = buildTriggerMulticastCommandMock({
        to: [...singleSubscribers, ...firstTopic, ...secondTopic],
        organizationId: session.organization._id,
        environmentId: session.environment._id,
        userId: session.user._id,
      }) as any;

      await triggerMulticast.execute(command);

      expect(sendToProcessSubscriberServiceStub.called).to.be.true;

      // we check by single subscribers (A, B)
      const firstCallStubArgs = sendToProcessSubscriberServiceStub.getCall(0).args;
      expect(firstCallStubArgs[0]).to.deep.equal(command);
      expect(firstCallStubArgs[1]).to.include.deep.members(singleSubscribers);
      expect(firstCallStubArgs[2]).to.be.equal(SubscriberSourceEnum.SINGLE);

      // we check by second topic subscribers without duplication (C, D)
      const secondTopicSubscribersDefine = mapSubscriberToSubscriberDefine(secondTopicSubscribers);

      const secondCallStubArgs = sendToProcessSubscriberServiceStub.getCall(1).args;
      expect(secondCallStubArgs[0]).to.deep.equal(command);
      expect(secondCallStubArgs[1]).to.include.deep.members(secondTopicSubscribersDefine);
      expect(secondCallStubArgs[2]).to.be.equal(SubscriberSourceEnum.TOPIC);
    });

    it('should batch topic subscribers by 100', async () => {
      for (let i = 0; i < 234; i++) {
        const newSubscriber = await subscriberService.createSubscriber();
        await addSubscribersToTopic(session, bootstrapFirstTopic, [newSubscriber]);
      }

      // first topic: subscribers A, B
      const firstTopic: TriggerRecipients = [
        { type: TriggerRecipientsTypeEnum.TOPIC, topicKey: TOPIC_KEY_PREFIX + '1' },
      ];

      const command: TriggerMulticastCommand = buildTriggerMulticastCommandMock({
        to: [...firstTopic],
        organizationId: session.organization._id,
        environmentId: session.environment._id,
        userId: session.user._id,
      }) as any;

      await triggerMulticast.execute(command);

      expect(sendToProcessSubscriberServiceStub.called).to.be.true;

      const firstCallStubArgs = sendToProcessSubscriberServiceStub.getCall(0).args;
      expect(firstCallStubArgs[0]).to.deep.equal(command);
      expect(firstCallStubArgs[1].length).to.equal(0);
      expect(firstCallStubArgs[2]).to.be.equal(SubscriberSourceEnum.SINGLE);

      const secondCallStubArgs = sendToProcessSubscriberServiceStub.getCall(1).args;
      expect(secondCallStubArgs[0]).to.deep.equal(command);
      expect(secondCallStubArgs[1].length).to.equal(100);
      expect(secondCallStubArgs[2]).to.be.equal(SubscriberSourceEnum.TOPIC);

      const thirdCallStubArgs = sendToProcessSubscriberServiceStub.getCall(2).args;
      expect(thirdCallStubArgs[0]).to.deep.equal(command);
      expect(thirdCallStubArgs[1].length).to.equal(100);
      expect(thirdCallStubArgs[2]).to.be.equal(SubscriberSourceEnum.TOPIC);

      const forthCallStubArgs = sendToProcessSubscriberServiceStub.getCall(3).args;
      expect(forthCallStubArgs[0]).to.deep.equal(command);
      expect(forthCallStubArgs[1].length).to.equal(36);
      expect(forthCallStubArgs[2]).to.be.equal(SubscriberSourceEnum.TOPIC);
    });
  });
});

const getErrorMessage = async (callback) => {
  let res;

  try {
    res = await callback();
  } catch (error) {
    res = error.message;
  }

  return res;
};

type TriggerMulticastCommandOverrides = Partial<TriggerMulticastCommand> & {
  organizationId: string;
  environmentId: string;
};
const buildTriggerMulticastCommandMock = (overrides: TriggerMulticastCommandOverrides): TriggerMulticastCommand => {
  return { ...(triggerMulticastCommandMock as any), ...overrides };
};

const triggerMulticastCommandMock = {
  userId: '65ccfbfb374a4f35856d76ef',
  environmentId: '65ccfbfb374a4f35856d76f7',
  organizationId: '65ccfbfb374a4f35856d76f1',
  identifier: 'test-event-b0a06229-98d2-4a15-b062-10146d10ef53',
  payload: {
    customVar: 'Testing of User Name',
  },
  overrides: {},
  to: ['65ccfbfb374a4f35856d7754'],
  transactionId: '428fa85a-2529-4186-80ad-3bf29d365de2',
  addressingType: 'multicast',
  requestCategory: 'single',
  tenant: null,
  template: {
    preferenceSettings: {
      email: true,
      sms: true,
      in_app: true,
      chat: true,
      push: true,
    },
    _id: '65ccfbfb374a4f35856d775c',
    name: 'Central Assurance Analyst',
    description: 'The Nagasaki Lander is the trademarked name of several series of Nagasaki sport bikes, tha',
    active: true,
    draft: false,
    critical: false,
    isBlueprint: false,
    _notificationGroupId: '65ccfbfb374a4f35856d76fa',
    tags: ['test-tag'],
    triggers: [
      {
        type: 'event',
        identifier: 'test-event-b0a06229-98d2-4a15-b062-10146d10ef53',
        variables: [
          {
            name: 'firstName',
            _id: '65ccfbfb374a4f35856d775e',
            id: '65ccfbfb374a4f35856d775e',
          },
          {
            name: 'lastName',
            _id: '65ccfbfb374a4f35856d775f',
            id: '65ccfbfb374a4f35856d775f',
          },
          {
            name: 'urlVariable',
            _id: '65ccfbfb374a4f35856d7760',
            id: '65ccfbfb374a4f35856d7760',
          },
        ],
        _id: '65ccfbfb374a4f35856d775d',
        reservedVariables: [],
        subscriberVariables: [],
        id: '65ccfbfb374a4f35856d775d',
      },
    ],
    steps: [
      {
        metadata: {
          timed: {
            weekDays: [],
            monthDays: [],
          },
        },
        active: true,
        shouldStopOnFail: false,
        filters: [],
        _templateId: '65ccfbfb374a4f35856d775a',
        variants: [],
        _id: '65ccfbfb374a4f35856d7761',
        id: '65ccfbfb374a4f35856d7761',
        template: {
          _id: '65ccfbfb374a4f35856d775a',
          type: 'sms',
          active: true,
          variables: [],
          content: 'Hello world {{customVar}}',
          _environmentId: '65ccfbfb374a4f35856d76f7',
          _organizationId: '65ccfbfb374a4f35856d76f1',
          _creatorId: '65ccfbfb374a4f35856d76ef',
          _feedId: '65ccfbfb374a4f35856d7726',
          _layoutId: '65ccfbfb374a4f35856d76fc',
          deleted: false,
          createdAt: '2024-02-14T17:44:27.529Z',
          updatedAt: '2024-02-14T17:44:27.529Z',
          __v: 0,
          id: '65ccfbfb374a4f35856d775a',
        },
      },
    ],
    _environmentId: '65ccfbfb374a4f35856d76f7',
    _organizationId: '65ccfbfb374a4f35856d76f1',
    _creatorId: '65ccfbfb374a4f35856d76ef',
    deleted: false,
    createdAt: '2024-02-14T17:44:27.532Z',
    updatedAt: '2024-02-14T17:44:27.532Z',
    __v: 0,
    id: '65ccfbfb374a4f35856d775c',
  },
};

const addSubscribersToTopic = async (
  session: UserSession,
  createdTopicDto: { _id: TopicId; key: TopicKey },
  subscribers: SubscriberEntity[]
) => {
  const subscriberIds: ExternalSubscriberId[] = subscribers.map(
    (subscriber: SubscriberEntity) => subscriber.subscriberId
  );

  const response = await axiosInstance.post(
    `${session.serverUrl}${TOPIC_PATH}/${createdTopicDto.key}/subscribers`,
    {
      subscribers: subscriberIds,
    },
    {
      headers: {
        authorization: `ApiKey ${session.apiKey}`,
      },
    }
  );

  expect(response.status).to.be.eq(200);
  expect(response.data.data).to.be.eql({
    succeeded: subscriberIds,
  });
};
