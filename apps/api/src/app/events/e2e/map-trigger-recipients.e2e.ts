import { Test } from '@nestjs/testing';
import { SubscribersService, UserSession } from '@novu/testing';
import {
  FeatureFlagsService,
  GetTopicSubscribersUseCase,
  MapTriggerRecipients,
  MapTriggerRecipientsCommand,
} from '@novu/application-generic';
import {
  SubscriberEntity,
  SubscriberRepository,
  TopicEntity,
  TopicRepository,
  CreateTopicSubscribersEntity,
  TopicSubscribersRepository,
} from '@novu/dal';
import {
  ISubscribersDefine,
  ITopic,
  SubscriberSourceEnum,
  TopicId,
  TopicKey,
  TopicName,
  TriggerRecipientsPayload,
  TriggerRecipientsTypeEnum,
} from '@novu/shared';
import { expect } from 'chai';
import { v4 as uuid } from 'uuid';
import { SharedModule } from '../../shared/shared.module';
import { EventsModule } from '../events.module';

const originalLaunchDarklySdkKey = process.env.LAUNCH_DARKLY_SDK_KEY;

describe('MapTriggerRecipientsUseCase', () => {
  let session: UserSession;
  let subscribersService: SubscribersService;
  let topicRepository: TopicRepository;
  let topicSubscribersRepository: TopicSubscribersRepository;
  let useCase: MapTriggerRecipients;

  describe('When feature disabled', () => {
    before(async () => {
      const featureFlagsService = new FeatureFlagsService();
      await featureFlagsService.initialize();

      process.env.LAUNCH_DARKLY_SDK_KEY = '';
      process.env.IS_TOPIC_NOTIFICATION_ENABLED = 'false';

      const moduleRef = await Test.createTestingModule({
        imports: [SharedModule, EventsModule],
        providers: [MapTriggerRecipients, GetTopicSubscribersUseCase],
      }).compile();

      session = new UserSession();
      await session.initialize();

      useCase = moduleRef.get<MapTriggerRecipients>(MapTriggerRecipients);
      subscribersService = new SubscribersService(session.organization._id, session.environment._id);
      topicRepository = new TopicRepository();
      topicSubscribersRepository = new TopicSubscribersRepository();
    });

    after(() => {
      process.env.LAUNCH_DARKLY_SDK_KEY = originalLaunchDarklySdkKey;
    });

    it('should map properly a single subscriber id as string', async () => {
      const transactionId = uuid();
      const subscriberId = SubscriberRepository.createObjectId();

      const command = buildCommand(session, transactionId, subscriberId);
      const result = await useCase.execute(command);

      expect(result).to.be.eql([{ subscriberId, _subscriberSource: SubscriberSourceEnum.SINGLE }]);
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

      expect(result).to.be.eql([{ ...recipient, _subscriberSource: SubscriberSourceEnum.SINGLE }]);
    });

    it('should only process the subscriber id and the subscriber recipients and ignore topics', async () => {
      const firstTopicKey = 'topic-key-mixed-recipients-1';
      const firstTopicName = 'topic-key-mixed-recipients-1-name';
      const secondTopicKey = 'topic-key-mixed-recipients-2';
      const secondTopicName = 'topic-key-mixed-recipients-2-name';
      const transactionId = uuid();

      const firstTopic = await createTopicEntity(
        session,
        topicRepository,
        topicSubscribersRepository,
        firstTopicKey,
        firstTopicName
      );
      const firstTopicId = firstTopic._id;
      const firstSubscriber = await subscribersService.createSubscriber();
      const secondSubscriber = await subscribersService.createSubscriber();
      await addSubscribersToTopic(session, topicRepository, topicSubscribersRepository, firstTopicId, firstTopicKey, [
        firstSubscriber,
        secondSubscriber,
      ]);

      const secondTopic = await createTopicEntity(
        session,
        topicRepository,
        topicSubscribersRepository,
        secondTopicKey,
        secondTopicName
      );
      const secondTopicId = secondTopic._id;
      const thirdSubscriber = await subscribersService.createSubscriber();
      await addSubscribersToTopic(session, topicRepository, topicSubscribersRepository, secondTopicId, secondTopicKey, [
        thirdSubscriber,
      ]);

      const firstTopicRecipient: ITopic = {
        type: TriggerRecipientsTypeEnum.TOPIC,
        topicKey: firstTopic._id,
      };
      const secondTopicRecipient: ITopic = {
        type: TriggerRecipientsTypeEnum.TOPIC,
        topicKey: secondTopic._id,
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
        { subscriberId: singleSubscriberId, _subscriberSource: SubscriberSourceEnum.SINGLE },
        { ...singleSubscribersDefine, _subscriberSource: SubscriberSourceEnum.SINGLE },
      ]);
    });

    it('should map properly multiple duplicated recipients of different types and deduplicate them', async () => {
      const transactionId = uuid();
      const firstSubscriberId = SubscriberRepository.createObjectId();
      const secondSubscriberId = SubscriberRepository.createObjectId();

      const firstRecipient: ISubscribersDefine = {
        subscriberId: firstSubscriberId,
        firstName: 'Test Name',
        lastName: 'Last of name',
        email: 'test@email.novu',
      };

      const secondRecipient: ISubscribersDefine = {
        subscriberId: secondSubscriberId,
        firstName: 'Test Name',
        lastName: 'Last of name',
        email: 'test@email.novu',
      };

      const command = buildCommand(session, transactionId, [
        firstSubscriberId,
        secondSubscriberId,
        firstRecipient,
        secondRecipient,
        secondSubscriberId,
        firstSubscriberId,
      ]);
      const result = await useCase.execute(command);

      expect(result).to.be.eql([
        { subscriberId: firstSubscriberId, _subscriberSource: SubscriberSourceEnum.SINGLE },
        { subscriberId: secondSubscriberId, _subscriberSource: SubscriberSourceEnum.SINGLE },
      ]);
    });
  });

  describe('When feature enabled', () => {
    before(async () => {
      process.env.LAUNCH_DARKLY_SDK_KEY = '';
      process.env.IS_TOPIC_NOTIFICATION_ENABLED = 'true';

      const moduleRef = await Test.createTestingModule({
        imports: [SharedModule, EventsModule],
        providers: [MapTriggerRecipients, GetTopicSubscribersUseCase],
      }).compile();

      session = new UserSession();
      await session.initialize();

      useCase = moduleRef.get<MapTriggerRecipients>(MapTriggerRecipients, { strict: false });
      subscribersService = new SubscribersService(session.organization._id, session.environment._id);
      topicRepository = new TopicRepository();
      topicSubscribersRepository = new TopicSubscribersRepository();
    });

    after(() => {
      process.env.LAUNCH_DARKLY_SDK_KEY = originalLaunchDarklySdkKey;
    });

    it('should map properly a single subscriber id as string', async () => {
      const transactionId = uuid();
      const subscriberId = SubscriberRepository.createObjectId();

      const command = buildCommand(session, transactionId, subscriberId);
      const result = await useCase.execute(command);

      expect(result).to.be.eql([{ subscriberId, _subscriberSource: SubscriberSourceEnum.SINGLE }]);
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

      expect(result).to.be.eql([{ ...recipient, _subscriberSource: SubscriberSourceEnum.SINGLE }]);
    });

    it('should map properly a single topic', async () => {
      const topicKey = 'topic-key-single-recipient';
      const topicName = 'topic-key-single-recipient-name';
      const transactionId = uuid();

      const topic = await createTopicEntity(session, topicRepository, topicSubscribersRepository, topicKey, topicName);
      const topicId = topic._id;
      const firstSubscriber = await subscribersService.createSubscriber();
      const secondSubscriber = await subscribersService.createSubscriber();
      await addSubscribersToTopic(session, topicRepository, topicSubscribersRepository, topicId, topicKey, [
        firstSubscriber,
        secondSubscriber,
      ]);

      const recipient: ITopic = {
        type: TriggerRecipientsTypeEnum.TOPIC,
        topicKey: topic.key,
      };

      const command = buildCommand(session, transactionId, [recipient]);

      const result = await useCase.execute(command);

      expect(result).to.include.deep.members([
        { subscriberId: firstSubscriber.subscriberId, _subscriberSource: SubscriberSourceEnum.TOPIC },
        { subscriberId: secondSubscriber.subscriberId, _subscriberSource: SubscriberSourceEnum.TOPIC },
      ]);
    });

    it('should throw an error if providing a topic that does not exist', async () => {
      const topicKey = 'topic-key-single-recipient';
      const topicName = 'topic-key-single-recipient-name';
      const transactionId = uuid();

      const recipient: ITopic = {
        type: TriggerRecipientsTypeEnum.TOPIC,
        topicKey: TopicRepository.createObjectId(),
      };

      const command = buildCommand(session, transactionId, [recipient]);

      let error;

      try {
        const result = await useCase.execute(command);
      } catch (e) {
        error = e;
      }

      expect(error).to.be.ok;
      expect(error.message).to.contain('not found in current environment');
    });

    it('should map properly a mixed recipients list with a string, a subscribers define interface and two topics', async () => {
      const firstTopicKey = 'topic-key-mixed-recipients-1';
      const firstTopicName = 'topic-key-mixed-recipients-1-name';
      const secondTopicKey = 'topic-key-mixed-recipients-2';
      const secondTopicName = 'topic-key-mixed-recipients-2-name';
      const transactionId = uuid();

      const firstTopic = await createTopicEntity(
        session,
        topicRepository,
        topicSubscribersRepository,
        firstTopicKey,
        firstTopicName
      );
      const firstTopicId = firstTopic._id;
      const firstSubscriber = await subscribersService.createSubscriber();
      const secondSubscriber = await subscribersService.createSubscriber();
      await addSubscribersToTopic(session, topicRepository, topicSubscribersRepository, firstTopicId, firstTopicKey, [
        firstSubscriber,
        secondSubscriber,
      ]);

      const secondTopic = await createTopicEntity(
        session,
        topicRepository,
        topicSubscribersRepository,
        secondTopicKey,
        secondTopicName
      );
      const secondTopicId = secondTopic._id;
      const thirdSubscriber = await subscribersService.createSubscriber();
      await addSubscribersToTopic(session, topicRepository, topicSubscribersRepository, secondTopicId, secondTopicKey, [
        thirdSubscriber,
      ]);

      const firstTopicRecipient: ITopic = {
        type: TriggerRecipientsTypeEnum.TOPIC,
        topicKey: firstTopic.key,
      };
      const secondTopicRecipient: ITopic = {
        type: TriggerRecipientsTypeEnum.TOPIC,
        topicKey: secondTopic.key,
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

      expect(result).to.include.deep.members([
        { subscriberId: singleSubscriberId, _subscriberSource: SubscriberSourceEnum.SINGLE },
        { ...singleSubscribersDefine, _subscriberSource: SubscriberSourceEnum.SINGLE },
        { subscriberId: firstSubscriber.subscriberId, _subscriberSource: SubscriberSourceEnum.TOPIC },
        { subscriberId: secondSubscriber.subscriberId, _subscriberSource: SubscriberSourceEnum.TOPIC },
        { subscriberId: thirdSubscriber.subscriberId, _subscriberSource: SubscriberSourceEnum.TOPIC },
      ]);
    });

    it('should map properly multiple duplicated recipients of different types and deduplicate them', async () => {
      const transactionId = uuid();
      const firstSubscriberId = SubscriberRepository.createObjectId();
      const secondSubscriberId = SubscriberRepository.createObjectId();

      const firstRecipient: ISubscribersDefine = {
        subscriberId: firstSubscriberId,
        firstName: 'Test Name',
        lastName: 'Last of name',
        email: 'test@email.novu',
      };

      const secondRecipient: ISubscribersDefine = {
        subscriberId: secondSubscriberId,
        firstName: 'Test Name',
        lastName: 'Last of name',
        email: 'test@email.novu',
      };

      const command = buildCommand(session, transactionId, [
        firstSubscriberId,
        secondSubscriberId,
        firstRecipient,
        secondRecipient,
        secondSubscriberId,
        firstSubscriberId,
      ]);
      const result = await useCase.execute(command);

      expect(result).to.be.eql([
        { subscriberId: firstSubscriberId, _subscriberSource: SubscriberSourceEnum.SINGLE },
        { subscriberId: secondSubscriberId, _subscriberSource: SubscriberSourceEnum.SINGLE },
      ]);
    });

    it('should map properly multiple duplicated recipients of different types and deduplicate them but with different order', async () => {
      const transactionId = uuid();
      const firstSubscriberId = SubscriberRepository.createObjectId();
      const secondSubscriberId = SubscriberRepository.createObjectId();

      const firstRecipient: ISubscribersDefine = {
        subscriberId: firstSubscriberId,
        firstName: 'Test Name',
        lastName: 'Last of name',
        email: 'test@email.novu',
      };

      const secondRecipient: ISubscribersDefine = {
        subscriberId: secondSubscriberId,
        firstName: 'Test Name',
        lastName: 'Last of name',
        email: 'test@email.novu',
      };

      const command = buildCommand(session, transactionId, [
        firstRecipient,
        secondRecipient,
        firstSubscriberId,
        secondSubscriberId,
        secondSubscriberId,
        firstSubscriberId,
        secondRecipient,
        firstRecipient,
      ]);
      const result = await useCase.execute(command);

      expect(result).to.be.eql([
        { ...firstRecipient, _subscriberSource: SubscriberSourceEnum.SINGLE },
        { ...secondRecipient, _subscriberSource: SubscriberSourceEnum.SINGLE },
      ]);
    });

    it('should map properly multiple topics and deduplicate them', async () => {
      const firstTopicKey = 'topic-key-mixed-topics-1';
      const firstTopicName = 'topic-key-mixed-topics-1-name';
      const secondTopicKey = 'topic-key-mixed-topics-2';
      const secondTopicName = 'topic-key-mixed-topics-2-name';
      const thirdTopicKey = 'topic-key-mixed-topics-3';
      const thirdTopicName = 'topic-key-mixed-topics-3-name';
      const transactionId = uuid();

      const firstSubscriber = await subscribersService.createSubscriber();
      const secondSubscriber = await subscribersService.createSubscriber();
      const thirdSubscriber = await subscribersService.createSubscriber();
      const fourthSubscriber = await subscribersService.createSubscriber();

      const firstTopic = await createTopicEntity(
        session,
        topicRepository,
        topicSubscribersRepository,
        firstTopicKey,
        firstTopicName
      );
      const firstTopicId = firstTopic._id;
      await addSubscribersToTopic(session, topicRepository, topicSubscribersRepository, firstTopicId, firstTopicKey, [
        firstSubscriber,
        secondSubscriber,
      ]);

      const secondTopic = await createTopicEntity(
        session,
        topicRepository,
        topicSubscribersRepository,
        secondTopicKey,
        secondTopicName
      );
      const secondTopicId = secondTopic._id;
      await addSubscribersToTopic(session, topicRepository, topicSubscribersRepository, secondTopicId, secondTopicKey, [
        thirdSubscriber,
      ]);

      const thirdTopic = await createTopicEntity(
        session,
        topicRepository,
        topicSubscribersRepository,
        thirdTopicKey,
        thirdTopicName
      );
      const thirdTopicId = thirdTopic._id;
      await addSubscribersToTopic(session, topicRepository, topicSubscribersRepository, thirdTopicId, thirdTopicKey, [
        firstSubscriber,
        fourthSubscriber,
      ]);

      const firstTopicRecipient: ITopic = {
        type: TriggerRecipientsTypeEnum.TOPIC,
        topicKey: firstTopic.key,
      };
      const secondTopicRecipient: ITopic = {
        type: TriggerRecipientsTypeEnum.TOPIC,
        topicKey: secondTopic.key,
      };
      const thirdTopicRecipient: ITopic = {
        type: TriggerRecipientsTypeEnum.TOPIC,
        topicKey: thirdTopic.key,
      };

      const command = buildCommand(session, transactionId, [
        thirdTopicRecipient,
        firstTopicRecipient,
        secondTopicRecipient,
        thirdTopicRecipient,
        secondTopicRecipient,
        firstTopicRecipient,
      ]);
      const result = await useCase.execute(command);

      expect(result).to.include.deep.members([
        { subscriberId: firstSubscriber.subscriberId, _subscriberSource: SubscriberSourceEnum.TOPIC },
        { subscriberId: fourthSubscriber.subscriberId, _subscriberSource: SubscriberSourceEnum.TOPIC },
        { subscriberId: secondSubscriber.subscriberId, _subscriberSource: SubscriberSourceEnum.TOPIC },
        { subscriberId: thirdSubscriber.subscriberId, _subscriberSource: SubscriberSourceEnum.TOPIC },
      ]);
    });

    it('should map properly multiple duplicated recipients of different types and topics and deduplicate them', async () => {
      const firstTopicKey = 'topic-key-mixed-recipients-deduplication-1';
      const firstTopicName = 'topic-key-mixed-recipients-deduplication-1-name';
      const secondTopicKey = 'topic-key-mixed-recipients-deduplication-2';
      const secondTopicName = 'topic-key-mixed-recipients-deduplication-2-name';
      const transactionId = uuid();

      const firstSubscriber = await subscribersService.createSubscriber();
      const secondSubscriber = await subscribersService.createSubscriber();
      const thirdSubscriber = await subscribersService.createSubscriber();

      const firstRecipient: ISubscribersDefine = {
        subscriberId: firstSubscriber.subscriberId,
        firstName: 'Test Name',
        lastName: 'Last of name',
        email: 'test@email.novu',
      };

      const secondRecipient: ISubscribersDefine = {
        subscriberId: secondSubscriber.subscriberId,
        firstName: 'Test Name',
        lastName: 'Last of name',
        email: 'test@email.novu',
      };

      const firstTopic = await createTopicEntity(
        session,
        topicRepository,
        topicSubscribersRepository,
        firstTopicKey,
        firstTopicName
      );
      const firstTopicId = firstTopic._id;
      await addSubscribersToTopic(session, topicRepository, topicSubscribersRepository, firstTopicId, firstTopicKey, [
        firstSubscriber,
        secondSubscriber,
      ]);

      const secondTopic = await createTopicEntity(
        session,
        topicRepository,
        topicSubscribersRepository,
        secondTopicKey,
        secondTopicName
      );
      const secondTopicId = secondTopic._id;
      await addSubscribersToTopic(session, topicRepository, topicSubscribersRepository, secondTopicId, secondTopicKey, [
        thirdSubscriber,
      ]);

      const firstTopicRecipient: ITopic = {
        type: TriggerRecipientsTypeEnum.TOPIC,
        topicKey: firstTopic.key,
      };
      const secondTopicRecipient: ITopic = {
        type: TriggerRecipientsTypeEnum.TOPIC,
        topicKey: secondTopic.key,
      };

      const command = buildCommand(session, transactionId, [
        secondTopicRecipient,
        firstRecipient,
        firstSubscriber.subscriberId,
        secondSubscriber.subscriberId,
        firstTopicRecipient,
        secondRecipient,
        thirdSubscriber.subscriberId,
      ]);
      const result = await useCase.execute(command);

      expect(result.length).to.equal(3);

      // We process first recipients that are not topics, so they will take precedence when deduplicating
      expect(result).to.include.deep.members([
        { ...firstRecipient, _subscriberSource: SubscriberSourceEnum.SINGLE },
        { subscriberId: secondSubscriber.subscriberId, _subscriberSource: SubscriberSourceEnum.SINGLE },
        { subscriberId: thirdSubscriber.subscriberId, _subscriberSource: SubscriberSourceEnum.SINGLE },
      ]);
    });
  });
});

const createTopicEntity = async (
  session: UserSession,
  topicRepository: TopicRepository,
  topicSubscribersRepository: TopicSubscribersRepository,
  topicKey: TopicKey,
  topicName: TopicName
): Promise<TopicEntity> => {
  const environmentId = session.environment._id;
  const organizationId = session.organization._id;

  const topicEntity = {
    _environmentId: environmentId,
    key: topicKey,
    name: topicName,
    _organizationId: organizationId,
  };
  const topic = await topicRepository.create(topicEntity);

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
  topicKey: TopicKey,
  subscribers: SubscriberEntity[]
): Promise<void> => {
  const _environmentId = session.environment._id;
  const _organizationId = session.organization._id;
  const _topicId = topicId;

  const entities: CreateTopicSubscribersEntity[] = subscribers.map((subscriber) => ({
    _environmentId,
    _organizationId,
    _subscriberId: subscriber._id,
    _topicId,
    topicKey,
    externalSubscriberId: subscriber.subscriberId,
  }));
  await topicSubscribersRepository.addSubscribers(entities);

  const result = await topicRepository.findTopic(topicKey, _environmentId);

  expect(result?.subscribers.length).to.be.eql(subscribers.length);
  expect(result?.subscribers).to.have.members(subscribers.map((subscriber) => subscriber.subscriberId));
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
