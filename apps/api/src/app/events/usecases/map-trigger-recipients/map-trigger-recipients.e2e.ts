import { Test } from '@nestjs/testing';
import { SubscribersService, UserSession } from '@novu/testing';
import {
  SubscriberRepository,
  TopicEntity,
  TopicRepository,
  TopicSubscribersEntity,
  TopicSubscribersRepository,
} from '@novu/dal';
import { ISubscribersDefine, ITopic, TriggerRecipientsPayload } from '@novu/node';
import { SubscriberId, TopicId, TopicKey, TopicName, TriggerRecipientsTypeEnum } from '@novu/shared';
import { expect } from 'chai';
import { v4 as uuid } from 'uuid';

import { MapTriggerRecipients } from './map-trigger-recipients.use-case';
import { MapTriggerRecipientsCommand } from './map-trigger-recipients.command';

import { SharedModule } from '../../../shared/shared.module';
import { EventsModule } from '../../events.module';

const createTopicEntity = async (
  session: UserSession,
  topicRepository: TopicRepository,
  topicSubscribersRepository: TopicSubscribersRepository,
  topicKey: TopicKey,
  topicName: TopicName
): Promise<TopicEntity> => {
  const environmentId = session.environment._id;
  const organizationId = session.organization._id;
  const userId = session.user._id;

  const topicEntity = {
    _environmentId: TopicRepository.convertStringToObjectId(environmentId),
    key: topicKey,
    name: topicName,
    _organizationId: TopicRepository.convertStringToObjectId(organizationId),
    _userId: TopicRepository.convertStringToObjectId(userId),
  };
  const topic = await topicRepository.create(topicEntity);

  const topicSubscribersEntity = {
    _environmentId: TopicRepository.convertStringToObjectId(environmentId),
    _topicId: topic._id,
    _organizationId: TopicRepository.convertStringToObjectId(organizationId),
    _userId: TopicRepository.convertStringToObjectId(userId),
  };

  const topicSubscribers = await topicSubscribersRepository.create(topicSubscribersEntity);

  expect(topic).to.exist;
  expect(topic.key).to.be.eql(topicKey);
  expect(topic.name).to.be.eql(topicName);

  return topic;
};

const addSubscribersToTopic = async (
  session: UserSession,
  topicRepository: TopicRepository,
  topicSubscribersRepository: TopicSubscribersRepository,
  topicId: TopicId,
  subscribers: SubscriberId[]
): Promise<void> => {
  const _environmentId = TopicSubscribersRepository.convertStringToObjectId(session.environment._id);
  const _organizationId = TopicSubscribersRepository.convertStringToObjectId(session.organization._id);
  const _topicId = TopicSubscribersRepository.convertStringToObjectId(topicId);
  const _userId = TopicSubscribersRepository.convertStringToObjectId(session.user._id);

  const entity: TopicSubscribersEntity = {
    _environmentId,
    _organizationId,
    _topicId,
    _userId,
    subscribers,
  };
  await topicSubscribersRepository.addSubscribers(entity);

  const result = await topicRepository.findTopic({
    _environmentId,
    _organizationId,
    _id: _topicId,
    _userId,
  });

  expect(result.subscribers).to.be.eql(subscribers);
};

const buildCommand = (
  session: UserSession,
  transactionId: string,
  recipients: TriggerRecipientsPayload
): MapTriggerRecipientsCommand => {
  return MapTriggerRecipientsCommand.create({
    organizationId: session.organization._id,
    environmentId: session.environment._id,
    recipients,
    transactionId,
    userId: session.user._id,
  });
};

describe('MapTriggerRecipientsUseCase', () => {
  let session: UserSession;
  let subscribersService: SubscribersService;
  let topicRepository: TopicRepository;
  let topicSubscribersRepository: TopicSubscribersRepository;
  let useCase: MapTriggerRecipients;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SharedModule, EventsModule],
      providers: [],
    }).compile();

    session = new UserSession();
    await session.initialize();

    useCase = moduleRef.get<MapTriggerRecipients>(MapTriggerRecipients);
    subscribersService = new SubscribersService(session.organization._id, session.environment._id);
    topicRepository = new TopicRepository();
    topicSubscribersRepository = new TopicSubscribersRepository();
  });

  it('should map properly a single subscriber id as string', async () => {
    const transactionId = uuid();
    const subscriberId = SubscriberRepository.createObjectId();

    const command = buildCommand(session, transactionId, subscriberId);
    const result = await useCase.execute(command);

    expect(result).to.be.eql([{ subscriberId }]);
  });

  it('should map properly a single subscriber defined payload', async () => {
    const transactionId = uuid();

    const subscriberId = SubscriberRepository.createObjectId();
    const recipient: ISubscribersDefine = {
      subscriberId,
      firstName: 'Test Name',
      lastName: 'Last of name',
      email: 'test@email.novu',
    };

    const command = buildCommand(session, transactionId, recipient);

    const result = await useCase.execute(command);

    expect(result).to.be.eql([{ ...recipient }]);
  });

  it('should map properly a single topic', async () => {
    const topicKey = 'topic-key-single-recipient';
    const topicName = 'topic-key-single-recipient-name';
    const transactionId = uuid();

    const environmentId = session.environment._id;
    const organizationId = session.organization._id;
    const userId = session.user._id;

    const topic = await createTopicEntity(session, topicRepository, topicSubscribersRepository, topicKey, topicName);
    const topicId = TopicRepository.convertObjectIdToString(topic._id);
    const firstSubscriber = await subscribersService.createSubscriber();
    const secondSubscriber = await subscribersService.createSubscriber();
    await addSubscribersToTopic(session, topicRepository, topicSubscribersRepository, topicId, [
      firstSubscriber._id,
      secondSubscriber._id,
    ]);

    const recipient: ITopic = {
      type: TriggerRecipientsTypeEnum.TOPIC,
      topicId: TopicRepository.convertObjectIdToString(topic._id),
    };

    const command = buildCommand(session, transactionId, [recipient]);

    const result = await useCase.execute(command);

    expect(result).to.be.eql([{ subscriberId: firstSubscriber._id }, { subscriberId: secondSubscriber._id }]);
  });

  it('should return an empty array if providing a topic that does not exist', async () => {
    const topicKey = 'topic-key-single-recipient';
    const topicName = 'topic-key-single-recipient-name';
    const transactionId = uuid();

    const environmentId = session.environment._id;
    const organizationId = session.organization._id;
    const userId = session.user._id;

    const recipient: ITopic = {
      type: TriggerRecipientsTypeEnum.TOPIC,
      topicId: TopicRepository.createObjectId(),
    };

    const command = buildCommand(session, transactionId, [recipient]);

    const result = await useCase.execute(command);

    expect(result).to.be.eql([]);
  });

  it('should map properly a mixed recipients list with a string, a subscribers define interface and two topics', async () => {
    const firstTopicKey = 'topic-key-mixed-recipients-1';
    const firstTopicName = 'topic-key-mixed-recipients-1-name';
    const secondTopicKey = 'topic-key-mixed-recipients-2';
    const secondTopicName = 'topic-key-mixed-recipients-2-name';

    const transactionId = uuid();

    const environmentId = session.environment._id;
    const organizationId = session.organization._id;
    const userId = session.user._id;

    const firstTopic = await createTopicEntity(
      session,
      topicRepository,
      topicSubscribersRepository,
      firstTopicKey,
      firstTopicName
    );
    const firstTopicId = TopicRepository.convertObjectIdToString(firstTopic._id);
    const firstSubscriber = await subscribersService.createSubscriber();
    const secondSubscriber = await subscribersService.createSubscriber();
    await addSubscribersToTopic(session, topicRepository, topicSubscribersRepository, firstTopicId, [
      firstSubscriber._id,
      secondSubscriber._id,
    ]);

    const secondTopic = await createTopicEntity(
      session,
      topicRepository,
      topicSubscribersRepository,
      secondTopicKey,
      secondTopicName
    );
    const secondTopicId = TopicRepository.convertObjectIdToString(secondTopic._id);
    const thirdSubscriber = await subscribersService.createSubscriber();
    await addSubscribersToTopic(session, topicRepository, topicSubscribersRepository, secondTopicId, [
      thirdSubscriber._id,
    ]);

    const firstTopicRecipient: ITopic = {
      type: TriggerRecipientsTypeEnum.TOPIC,
      topicId: TopicRepository.convertObjectIdToString(firstTopic._id),
    };
    const secondTopicRecipient: ITopic = {
      type: TriggerRecipientsTypeEnum.TOPIC,
      topicId: TopicRepository.convertObjectIdToString(secondTopic._id),
    };

    const singleSubscriberId = SubscriberRepository.createObjectId();
    const subscribersDefineSubscriberId = SubscriberRepository.createObjectId();
    const singleSubscribersDefine: ISubscribersDefine = {
      subscriberId: subscribersDefineSubscriberId,
      firstName: 'Test Name',
      lastName: 'Last of name',
      email: 'test@email.novu',
    };

    const recipients = [firstTopicRecipient, singleSubscriberId, secondTopicRecipient, singleSubscribersDefine];

    const command = buildCommand(session, transactionId, recipients);

    const result = await useCase.execute(command);

    expect(result).to.be.eql([
      { subscriberId: singleSubscriberId },
      { ...singleSubscribersDefine },
      { subscriberId: firstSubscriber._id },
      { subscriberId: secondSubscriber._id },
      { subscriberId: thirdSubscriber._id },
    ]);
  });
});
