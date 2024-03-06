import axios from 'axios';
import { beforeEach } from 'mocha';
import { expect } from 'chai';

import { ExternalSubscriberId, TopicId, TopicKey, TopicName } from '@novu/shared';
import { SubscriberEntity, SubscriberRepository, TopicSubscribersRepository } from '@novu/dal';
import { UserSession, SubscribersService } from '@novu/testing';

import { topicSubscriberNormalize } from './topic-subscriber-normalize.migration';

const axiosInstance = axios.create();
const TOPIC_PATH = '/v1/topics';

describe('Remove all the stale topic subscriber relations', () => {
  let session: UserSession;
  let subscriberService: SubscribersService;
  const subscriberRepository = new SubscriberRepository();
  const topicSubscribersRepository = new TopicSubscribersRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    subscriberService = new SubscribersService(session.organization._id, session.environment._id);
  });

  it('should remove topic subscriber relation record on removed subscribers', async () => {
    const subscriberId = '123';
    const createdSubscriber = await subscriberService.createSubscriber({ subscriberId: subscriberId });
    const firstTopicKey = `topic-key-1-trigger-event`;
    const firstTopicName = `topic-name-1-trigger-event`;
    const newTopic = await createTopic(session, firstTopicKey, firstTopicName);
    await addSubscribersToTopic(session, { _id: newTopic._id, key: newTopic.key }, [createdSubscriber]);

    // create subscriber and its relation to topic
    const subscriber = await subscriberRepository.findBySubscriberId(session.environment._id, subscriberId);
    const topicSubscriber = await topicSubscribersRepository.findOne({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      externalSubscriberId: subscriberId,
    });

    if (!subscriber) {
      expect(subscriber).to.be.ok;
      throw new Error('Subscriber not found');
    }
    if (!topicSubscriber) {
      expect(topicSubscriber).to.be.ok;
      throw new Error('topicSubscriber not found');
    }

    expect(subscriber.subscriberId).to.be.equal(subscriberId);
    expect(topicSubscriber.externalSubscriberId).to.be.equal(subscriberId);
    // END - create subscriber and its relation to topic

    await subscriberRepository.delete({
      _environmentId: subscriber._environmentId,
      _organizationId: subscriber._organizationId,
      subscriberId: subscriber.subscriberId,
    });

    const subscriberAfterDeletion = await subscriberRepository.findBySubscriberId(
      session.environment._id,
      subscriberId
    );
    const topicSubscriberAfterDeletion = await topicSubscribersRepository.findOne({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      externalSubscriberId: subscriberId,
    });

    expect(subscriberAfterDeletion).to.not.be.ok;
    expect(topicSubscriberAfterDeletion).to.be.ok;

    await topicSubscriberNormalize();

    const topicSubscriberAfterMigration = await topicSubscribersRepository.findOne({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      externalSubscriberId: subscriberId,
    });

    expect(topicSubscriberAfterMigration).to.not.be.ok;
  });
});

const createTopic = async (
  session: UserSession,
  key: TopicKey,
  name: TopicName
): Promise<{ _id: TopicId; key: TopicKey }> => {
  const response = await axiosInstance.post(
    `${session.serverUrl}${TOPIC_PATH}`,
    {
      key,
      name,
    },
    {
      headers: {
        authorization: `ApiKey ${session.apiKey}`,
      },
    }
  );

  expect(response.status).to.eql(201);
  const body = response.data;
  expect(body.data._id).to.exist;
  expect(body.data.key).to.eql(key);

  return body.data;
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
