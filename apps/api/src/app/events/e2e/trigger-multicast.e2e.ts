import { expect } from 'chai';
import * as sinon from 'sinon';
import { Test } from '@nestjs/testing';
import axios from 'axios';

import { SubscribersService, UserSession } from '@novu/testing';
import {
  ExternalSubscriberId,
  ISubscribersDefine,
  ITopic,
  SubscriberSourceEnum,
  TopicId,
  TopicKey,
  TriggerRecipients,
  TriggerRecipientsTypeEnum,
} from '@novu/shared';
import {
  IProcessSubscriberBulkJobDto,
  mapSubscribersToJobs,
  SubscriberProcessQueueService,
  TriggerMulticast,
  TriggerMulticastCommand,
} from '@novu/application-generic';
import { NotificationTemplateEntity, SubscriberEntity } from '@novu/dal';

import { SharedModule } from '../../shared/shared.module';
import { EventsModule } from '../events.module';
import { createTopic } from '../../topics/e2e/helpers';

const axiosInstance = axios.create();

const TOPIC_PATH = '/v1/topics';
const TOPIC_KEY_PREFIX = 'topic-key-trigger-event_';
const TOPIC_NAME_PREFIX = 'topic-name-trigger-event_';

export class MockSubscriberProcessQueueService {
  addBulk(data: IProcessSubscriberBulkJobDto[]) {}
}

function mapSubscriberToSubscriberDefine(firstTopicSubscribers: SubscriberEntity[]) {
  return firstTopicSubscribers.map((subscriber) => ({ subscriberId: subscriber.subscriberId }));
}

function expectBulkTopicStub(secondCallStubArgs: IProcessSubscriberBulkJobDto[], jobs: IProcessSubscriberBulkJobDto[]) {
  for (const stubJobAny of secondCallStubArgs) {
    const stubJob: IProcessSubscriberBulkJobDto = stubJobAny;
    const job = jobs.find((xJob) => xJob.name === stubJob.name);
    if (!job) {
      expect(job).to.be.ok;

      return;
    }
    expect(job.name).to.be.equal(stubJob.name);
    expect(job.groupId).to.be.equal(stubJob.groupId);
    expect(job.options).to.be.equal(stubJob.options);

    const { subscriber, ...jobDataWithoutSubscriber } = job.data;
    const { subscriber: stubSubscriber, ...stubJobDataWithoutSubscriber } = stubJob.data;

    expect(subscriber.subscriberId).to.be.equal(stubSubscriber.subscriberId);
    expect(jobDataWithoutSubscriber).to.deep.equal(stubJobDataWithoutSubscriber);
  }
}

function expectBulkSingleSubscriberStub(
  secondCallStubArgs: IProcessSubscriberBulkJobDto[],
  jobs: IProcessSubscriberBulkJobDto[]
) {
  for (const stubJobAny of secondCallStubArgs) {
    const stubJob: IProcessSubscriberBulkJobDto = stubJobAny;
    const job = jobs.find((xJob) => xJob.name === stubJob.name);
    if (!job) {
      expect(job).to.be.ok;

      return;
    }
    expect(job.name).to.be.equal(stubJob.name);
    expect(job.groupId).to.be.equal(stubJob.groupId);
    expect(job.options).to.be.equal(stubJob.options);
    expect(job.data).to.deep.equal(stubJob.data);
  }
}

describe('TriggerMulticast', () => {
  let triggerMulticast: TriggerMulticast;
  let subscriberProcessQueueService: SubscriberProcessQueueService;
  let addBulkStub: sinon.SinonStub;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SharedModule, EventsModule],
      providers: [
        TriggerMulticast,
        {
          provide: SubscriberProcessQueueService,
          useClass: MockSubscriberProcessQueueService,
        },
      ],
    }).compile();

    triggerMulticast = moduleRef.get<TriggerMulticast>(TriggerMulticast);
    subscriberProcessQueueService = moduleRef.get<SubscriberProcessQueueService>(SubscriberProcessQueueService);
    addBulkStub = sinon.stub(subscriberProcessQueueService, 'addBulk');
  });

  afterEach(() => {
    addBulkStub.restore();
  });

  let session: UserSession;
  let template: NotificationTemplateEntity;
  let firstSubscriber: SubscriberEntity;
  let secondSubscriber: SubscriberEntity;
  let thirdSubscriber: SubscriberEntity;
  let forthSubscriber: SubscriberEntity;
  let subscriberService: SubscribersService;
  let bootstrapFirstTopic: ITopic & { _id: TopicId };
  let bootstrapSecondTopic: ITopic & { _id: TopicId };
  let to: TriggerRecipients;
  let firstTopicSubscribers: SubscriberEntity[];
  let secondTopicSubscribers: SubscriberEntity[];

  async function initializeTopic(subscribersToAdd: SubscriberEntity[], topicIndex: string) {
    const firstTopicKey = TOPIC_KEY_PREFIX + topicIndex;
    const firstTopicName = TOPIC_NAME_PREFIX + topicIndex;
    const createdTopic: { _id: TopicId; key: TopicKey } = await createTopic(session, firstTopicKey, firstTopicName);
    await addSubscribersToTopic(
      session,
      { topicKey: createdTopic.key, type: TriggerRecipientsTypeEnum.TOPIC },
      subscribersToAdd
    );

    const res: ITopic & { _id: TopicId } = {
      _id: createdTopic._id,
      topicKey: createdTopic.key,
      type: TriggerRecipientsTypeEnum.TOPIC,
    };

    return res;
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
    to = [bootstrapFirstTopic];

    thirdSubscriber = await subscriberService.createSubscriber();
    forthSubscriber = await subscriberService.createSubscriber();
    secondTopicSubscribers = [thirdSubscriber, forthSubscriber];
    bootstrapSecondTopic = await initializeTopic(secondTopicSubscribers, '2');
  });

  it('should call addBulk with correct parameters', async () => {
    const command: TriggerMulticastCommand = triggerMulticastCommandMock as any;

    const subscribers: ISubscribersDefine[] = [{ subscriberId: command.to[0] }];

    await triggerMulticast.execute(command);

    expect(addBulkStub.callCount).to.be.equal(1);

    const firstCallStubData = addBulkStub.getCall(0).args[0];
    const firstJobs = mapSubscribersToJobs(SubscriberSourceEnum.SINGLE, subscribers, command);

    expectBulkSingleSubscriberStub(firstCallStubData, firstJobs);
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

    expect(res).to.be.equal(`Topic with key ${invalidTopicKey} not found in current environment`);
  });

  it('should send only single subscribers forward to processing', async () => {
    const singleSubscribers = firstTopicSubscribers;
    const command: TriggerMulticastCommand = buildTriggerMulticastCommandMock({
      to: singleSubscribers,
      organizationId: session.organization._id,
      environmentId: session.environment._id,
      userId: session.user._id,
    }) as any;

    await triggerMulticast.execute(command);

    expect(addBulkStub.callCount).to.be.equal(1);

    const firstCallStubData = addBulkStub.getCall(0).args[0];
    const firstJobs = mapSubscribersToJobs(SubscriberSourceEnum.SINGLE, singleSubscribers, command);

    expectBulkSingleSubscriberStub(firstCallStubData, firstJobs);
  });

  it('should fan-out only subscriber from topic to processing', async () => {
    const firstTopic: TriggerRecipients = [bootstrapFirstTopic];
    const command: TriggerMulticastCommand = buildTriggerMulticastCommandMock({
      to: firstTopic,
      organizationId: session.organization._id,
      environmentId: session.environment._id,
      userId: session.user._id,
    }) as any;

    await triggerMulticast.execute(command);

    expect(addBulkStub.callCount).to.be.equal(1);

    const firstCallStubData = addBulkStub.getCall(0).args[0];
    const firstJobs = mapSubscribersToJobs(SubscriberSourceEnum.TOPIC, firstTopicSubscribers, command);
    expectBulkTopicStub(firstCallStubData, firstJobs);
  });

  it('should send single subscribers and fan-out subscriber from topic forward to to processing', async () => {
    const singleSubscribers = secondTopicSubscribers;
    const firstTopic: TriggerRecipients = [bootstrapFirstTopic];
    const command: TriggerMulticastCommand = buildTriggerMulticastCommandMock({
      to: [...singleSubscribers, ...firstTopic],
      organizationId: session.organization._id,
      environmentId: session.environment._id,
      userId: session.user._id,
    }) as any;

    await triggerMulticast.execute(command);

    expect(addBulkStub.callCount).to.be.equal(2);

    const firstCallStubData = addBulkStub.getCall(0).args[0];
    const firstJobs = mapSubscribersToJobs(SubscriberSourceEnum.SINGLE, singleSubscribers, command);

    expectBulkSingleSubscriberStub(firstCallStubData, firstJobs);

    const secondJobs = mapSubscribersToJobs(SubscriberSourceEnum.TOPIC, firstTopicSubscribers, command);
    const secondCallStubData: IProcessSubscriberBulkJobDto[] = addBulkStub.getCall(1).args[0];

    expectBulkTopicStub(secondCallStubData, secondJobs);
  });

  it('should exclude the actor from the topic fan-out', async () => {
    const actor = firstSubscriber;
    const firstTopic: TriggerRecipients = [bootstrapFirstTopic];
    const subscribersDefine = mapSubscriberToSubscriberDefine(firstTopicSubscribers);
    const command: TriggerMulticastCommand = buildTriggerMulticastCommandMock({
      to: [...firstTopic],
      organizationId: session.organization._id,
      environmentId: session.environment._id,
      userId: session.user._id,
      actor: actor,
    }) as any;

    await triggerMulticast.execute(command);

    expect(addBulkStub.callCount).to.be.equal(1);

    const topicSubscribersWithoutActor = subscribersDefine.filter(
      (subscriber) => subscriber.subscriberId !== actor.subscriberId
    );

    const firstCallStubData = addBulkStub.getCall(0).args[0];
    const firstJobs = mapSubscribersToJobs(SubscriberSourceEnum.TOPIC, topicSubscribersWithoutActor, command);

    expectBulkTopicStub(firstCallStubData, firstJobs);
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
    const firstTopic: TriggerRecipients = [bootstrapFirstTopic];
    const command: TriggerMulticastCommand = buildTriggerMulticastCommandMock({
      to: [...singleSubscribers, ...firstTopic],
      organizationId: session.organization._id,
      environmentId: session.environment._id,
      userId: session.user._id,
    }) as any;

    await triggerMulticast.execute(command);

    expect(addBulkStub.callCount).to.be.equal(2);

    const firstCallStubData = addBulkStub.getCall(0).args[0];
    const firstJobs = mapSubscribersToJobs(SubscriberSourceEnum.SINGLE, singleSubscribers, command);
    expectBulkSingleSubscriberStub(firstCallStubData, firstJobs);

    const secondCallStubData = addBulkStub.getCall(1).args[0];
    const secondJobs = mapSubscribersToJobs(SubscriberSourceEnum.TOPIC, [newSubscriber], command);
    expectBulkTopicStub(secondCallStubData, secondJobs);
  });

  it('should deduplicate subscribers across topics', async () => {
    // first topic: subscribers A, B
    const firstTopic: TriggerRecipients = [bootstrapFirstTopic];

    // second topic: subscribers C, D
    const secondTopic: TriggerRecipients = [bootstrapSecondTopic];

    /*
     * add to second topic subscribers from first topic,
     * now second topic(A, B, C, D) contains duplication with first topic(A, B) subscribers
     */
    await addSubscribersToTopic(session, bootstrapSecondTopic, firstTopicSubscribers);

    /*
     * in this case we have the same subscriber twice,
     * firstTopic contains: A, B
     * secondTopic contains: A, B, C, D
     */
    const command: TriggerMulticastCommand = buildTriggerMulticastCommandMock({
      to: [...firstTopic, ...secondTopic],
      organizationId: session.organization._id,
      environmentId: session.environment._id,
      userId: session.user._id,
    }) as any;

    await triggerMulticast.execute(command);

    expect(addBulkStub.callCount).to.be.equal(1);

    const firstCallStubData = addBulkStub.getCall(0).args[0];
    const firstJobs = mapSubscribersToJobs(
      SubscriberSourceEnum.TOPIC,
      [...firstTopicSubscribers, ...secondTopicSubscribers],
      command
    );
    expectBulkTopicStub(firstCallStubData, firstJobs);
  });

  it('should deduplicate subscribers across single subscribers and topics', async () => {
    const newSubscriber = await subscriberService.createSubscriber();
    await addSubscribersToTopic(session, bootstrapFirstTopic, [newSubscriber]);

    // first topic: subscribers A, B, newSubscriber
    const firstTopic: TriggerRecipients = [bootstrapFirstTopic];

    // second topic: subscribers C, D
    const secondTopic: TriggerRecipients = [bootstrapSecondTopic];

    /*
     * add to second topic subscribers from first topic,
     * now second topic(A, B, C, D) contains duplication with first topic(A, B) subscribers
     */
    await addSubscribersToTopic(session, bootstrapSecondTopic, firstTopicSubscribers);

    const singleSubscribers = firstTopicSubscribers;
    /*
     * in this case we have the same subscriber twice,
     * however, the newSubscriber is not duplicated and should be sent only once by topic
     * singleSubscribers contains: A, B
     * firstTopic contains: A, B, newSubscriber
     * secondTopic contains: A, B, C, D
     */
    const command: TriggerMulticastCommand = buildTriggerMulticastCommandMock({
      to: [...singleSubscribers, ...firstTopic, ...secondTopic],
      organizationId: session.organization._id,
      environmentId: session.environment._id,
      userId: session.user._id,
    }) as any;

    await triggerMulticast.execute(command);

    expect(addBulkStub.callCount).to.be.equal(2);

    // we check by single subscribers (A, B)
    const firstCallStubData = addBulkStub.getCall(0).args[0];
    const firstJobs = mapSubscribersToJobs(SubscriberSourceEnum.SINGLE, singleSubscribers, command);
    expectBulkSingleSubscriberStub(firstCallStubData, firstJobs);

    // we check by second topic subscribers with newSubscriber (C, D, newSubscriber)
    const modifiedSecondTopicSubscribersDefine = mapSubscriberToSubscriberDefine([
      ...secondTopicSubscribers,
      newSubscriber,
    ]);
    const secondCallStubData = addBulkStub.getCall(1).args[0];
    const secondJobs = mapSubscribersToJobs(SubscriberSourceEnum.TOPIC, modifiedSecondTopicSubscribersDefine, command);

    expectBulkTopicStub(secondCallStubData, secondJobs);
  });

  it('should batch topic subscribers by 100', async () => {
    for (let i = 0; i < 234; i++) {
      const newSubscriber = await subscriberService.createSubscriber();
      await addSubscribersToTopic(session, bootstrapFirstTopic, [newSubscriber]);
    }

    // first topic: subscribers A, B
    const firstTopic: TriggerRecipients = [bootstrapFirstTopic];

    const command: TriggerMulticastCommand = buildTriggerMulticastCommandMock({
      to: [...firstTopic],
      organizationId: session.organization._id,
      environmentId: session.environment._id,
      userId: session.user._id,
    }) as any;

    await triggerMulticast.execute(command);

    expect(addBulkStub.callCount).to.be.equal(3);

    const firstCallStubData: IProcessSubscriberBulkJobDto[] = addBulkStub.getCall(0).args[0];
    expect(firstCallStubData.length).to.equal(100);
    expect(firstCallStubData[0].data._subscriberSource).to.equal(SubscriberSourceEnum.TOPIC);

    const secondCallStubData: IProcessSubscriberBulkJobDto[] = addBulkStub.getCall(1).args[0];
    expect(secondCallStubData.length).to.equal(100);
    expect(secondCallStubData[0].data._subscriberSource).to.equal(SubscriberSourceEnum.TOPIC);

    const thirdCallStubData: IProcessSubscriberBulkJobDto[] = addBulkStub.getCall(2).args[0];
    expect(thirdCallStubData.length).to.equal(36);
    expect(thirdCallStubData[0].data._subscriberSource).to.equal(SubscriberSourceEnum.TOPIC);
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
  createdTopicDto: ITopic,
  subscribers: SubscriberEntity[]
) => {
  const subscriberIds: ExternalSubscriberId[] = subscribers.map(
    (subscriber: SubscriberEntity) => subscriber.subscriberId
  );

  const response = await axiosInstance.post(
    `${session.serverUrl}${TOPIC_PATH}/${createdTopicDto.topicKey}/subscribers`,
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
  expect(response.data.data.succeeded).to.have.deep.members(subscriberIds);
};
