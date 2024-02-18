import { SubscribersService, UserSession } from '@novu/testing';
import { SubscriberEntity, SubscriberRepository, TopicSubscribersRepository } from '@novu/dal';
import { expect } from 'chai';
import axios from 'axios';
import { ExternalSubscriberId, TopicId, TopicKey, TopicName } from '@novu/shared';

const axiosInstance = axios.create();
const TOPIC_PATH = '/v1/topics';

describe('Delete Subscriber - /subscribers/:subscriberId (DELETE)', function () {
  let session: UserSession;
  let subscriberService: SubscribersService;
  const subscriberRepository = new SubscriberRepository();
  const topicSubscribersRepository = new TopicSubscribersRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    subscriberService = new SubscribersService(session.organization._id, session.environment._id);
  });

  it('should delete an existing subscriber', async function () {
    await axiosInstance.post(
      `${session.serverUrl}/v1/subscribers`,
      {
        subscriberId: '123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@doe.com',
        phone: '+972523333333',
      },
      {
        headers: {
          authorization: `ApiKey ${session.apiKey}`,
        },
      }
    );

    const createdSubscriber = await subscriberRepository.findBySubscriberId(session.environment._id, '123');
    expect(createdSubscriber?.subscriberId).to.equal('123');

    await axiosInstance.delete(`${session.serverUrl}/v1/subscribers/123`, {
      headers: {
        authorization: `ApiKey ${session.apiKey}`,
      },
    });

    const isDeleted = !(await subscriberRepository.findBySubscriberId(session.environment._id, '123'));

    expect(isDeleted).to.equal(true);

    const deletedSubscriber = (
      await subscriberRepository.findDeleted({
        _environmentId: session.environment._id,
        subscriberId: '123',
      })
    )?.[0];

    expect(deletedSubscriber.deleted).to.equal(true);
  });

  it('should dispose subscriber relations to topic once he was removed', async () => {
    const subscriberId = '123';

    const subscriber = await subscriberService.createSubscriber({ subscriberId: subscriberId });
    for (let i = 0; i < 50; i++) {
      const firstTopicKey = `topic-key-${i}-trigger-event`;
      const firstTopicName = `topic-name-${i}-trigger-event`;
      const newTopic = await createTopic(session, firstTopicKey, firstTopicName);
      await addSubscribersToTopic(session, { _id: newTopic._id, key: newTopic.key }, [subscriber]);
    }

    const createdRelations = await topicSubscribersRepository.find({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      externalSubscriberId: subscriberId,
    });

    expect(createdRelations.length).to.equal(50);

    await axiosInstance.delete(`${session.serverUrl}/v1/subscribers/${subscriberId}`, {
      headers: {
        authorization: `ApiKey ${session.apiKey}`,
      },
    });

    const deletedRelations = await topicSubscribersRepository.find({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      externalSubscriberId: subscriberId,
    });

    expect(deletedRelations.length).to.equal(0);
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
