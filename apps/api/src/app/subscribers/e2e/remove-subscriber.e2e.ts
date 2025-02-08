import { SubscribersService, UserSession } from '@novu/testing';
import { SubscriberEntity, SubscriberRepository, TopicSubscribersRepository } from '@novu/dal';
import { expect } from 'chai';
import { ExternalSubscriberId, TopicKey, TopicName } from '@novu/shared';
import { Novu } from '@novu/api';
import { CreateTopicResponseDto } from '@novu/api/models/components';
import { initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

const subscriberId = '123';
describe('Delete Subscriber - /subscribers/:subscriberId (DELETE) #novu-v2', function () {
  let session: UserSession;
  let subscriberService: SubscribersService;
  const subscriberRepository = new SubscriberRepository();
  const topicSubscribersRepository = new TopicSubscribersRepository();
  let novuClient: Novu;
  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    subscriberService = new SubscribersService(session.organization._id, session.environment._id);
    novuClient = initNovuClassSdk(session);
  });

  it('should delete an existing subscriber', async function () {
    await novuClient.subscribers.create({
      subscriberId,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@doe.com',
      phone: '+972523333333',
    });

    const createdSubscriber = await subscriberRepository.findBySubscriberId(session.environment._id, subscriberId);
    expect(createdSubscriber?.subscriberId).to.equal(subscriberId);
    await novuClient.subscribers.delete(subscriberId);
    const subscriber = await subscriberRepository.findBySubscriberId(session.environment._id, subscriberId);
    expect(subscriber).to.be.null;
  });

  it('should dispose subscriber relations to topic once he was removed', async () => {
    const subscriber = await subscriberService.createSubscriber({ subscriberId });
    for (let i = 0; i < 50; i += 1) {
      const firstTopicKey = `topic-key-${i}-trigger-event`;
      const firstTopicName = `topic-name-${i}-trigger-event`;
      const newTopic = await createTopic(firstTopicKey, firstTopicName);
      await addSubscribersToTopic(newTopic, [subscriber]);
    }

    const createdRelations = await topicSubscribersRepository.find({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      externalSubscriberId: subscriberId,
    });

    expect(createdRelations.length).to.equal(50);
    await novuClient.subscribers.delete(subscriberId);
    const deletedRelations = await topicSubscribersRepository.find({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      externalSubscriberId: subscriberId,
    });

    expect(deletedRelations.length).to.equal(0);
  });
  const createTopic = async (key: TopicKey, name: TopicName): Promise<CreateTopicResponseDto> => {
    const response = await novuClient.topics.create({
      key,
      name,
    });

    const body = response.result;
    expect(body.id).to.exist;
    expect(body.key).to.eql(key);

    return body;
  };
  const addSubscribersToTopic = async (createdTopicDto: CreateTopicResponseDto, subscribers: SubscriberEntity[]) => {
    const subscriberIds: ExternalSubscriberId[] = subscribers.map(
      (subscriber: SubscriberEntity) => subscriber.subscriberId
    );

    const response = await novuClient.topics.subscribers.assign(
      {
        subscribers: subscriberIds,
      },
      createdTopicDto.key
    );

    expect(response.result).to.be.eql({
      succeeded: subscriberIds,
    });
  };
});
