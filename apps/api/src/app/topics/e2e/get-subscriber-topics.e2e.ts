import { SubscriberEntity } from '@novu/dal';
import { SubscribersService, UserSession } from '@novu/testing';
import { expect } from 'chai';

const BASE_PATH = '/v1/topics';

const buildUrl = (subscriberId: string): string => `${BASE_PATH}/subscribers/${subscriberId}`;

describe('Get subscriber topics -  /topics/subscribers/:subscriberId', () => {
  let session: UserSession;
  let subscriber: SubscriberEntity;

  before(async () => {
    session = new UserSession();
    await session.initialize();

    const subscriberService = new SubscribersService(session.organization._id, session.environment._id);
    subscriber = await subscriberService.createSubscriber();
  });

  it("should get subscriber's topic successfully", async () => {
    const topicMeta = [
      { name: 'topic-name-1', key: 'topic-key-1' },
      { name: 'topic-name-2', key: 'topic-key-2' },
    ];
    const { subscriberId } = subscriber;

    for (const { name, key } of topicMeta) {
      await createTopics(session, key, name);
      await addSubscriberToTopic(session, subscriberId, key);
    }

    const getResponse = await session.testAgent.get(buildUrl(subscriberId));

    expect(getResponse.statusCode).to.eql(200);

    const subscriberTopics = getResponse.body.data;

    expect(subscriberTopics.length).to.eql(2);
    expect(subscriberTopics[0].topicKey).to.eql(topicMeta[0].key);
    expect(subscriberTopics[0].externalSubscriberId).to.eql(subscriberId);
    expect(subscriberTopics[1].topicKey).to.eql(topicMeta[1].key);
  });

  it('should fetch only specified pageSize count', async () => {
    const topicMeta = [
      { name: 'topic-name-3', key: 'topic-key-3' },
      { name: 'topic-name-4', key: 'topic-key-4' },
      { name: 'topic-name-5', key: 'topic-key-5' },
    ];
    const { subscriberId } = subscriber;

    for (const { name, key } of topicMeta) {
      await createTopics(session, key, name);
      await addSubscriberToTopic(session, subscriberId, key);
    }

    const getResponse = await session.testAgent.get(`${buildUrl(subscriberId)}?pageSize=2`);
    expect(getResponse.statusCode).to.eql(200);

    const subscriberTopics = getResponse.body.data;
    expect(subscriberTopics.length).to.eql(2);
    expect(subscriberTopics[0].externalSubscriberId).to.eql(subscriberId);
  });
});

const createTopics = async (session: UserSession, topicKey: string, topicName: string) => {
  const { body } = await session.testAgent.post(BASE_PATH).send({
    key: topicKey,
    name: topicName,
  });

  return body;
};

const addSubscriberToTopic = async (session: UserSession, subscriberId: string, topicKey: string) => {
  const addSubscribersUrl = `${BASE_PATH}/${topicKey}/subscribers`;
  const { body } = await session.testAgent.post(addSubscribersUrl).send({
    subscribers: [subscriberId],
  });

  return body;
};
