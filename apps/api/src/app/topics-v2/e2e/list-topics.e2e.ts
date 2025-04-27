import { Novu } from '@novu/api';
import { SubscriberEntity } from '@novu/dal';
import { ExternalSubscriberId, TopicKey } from '@novu/shared';
import { SubscribersService, UserSession } from '@novu/testing';
import { expect } from 'chai';
import { initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('List topics - /v2/topics (GET) #novu-v2', async () => {
  let session: UserSession;
  let novuClient: Novu;
  let firstSubscriber: SubscriberEntity;
  let secondSubscriber: SubscriberEntity;

  before(async () => {
    session = new UserSession();
    await session.initialize();

    // Create multiple topics for testing pagination
    await createNewTopic(session, 'topic-key-1');
    await createNewTopic(session, 'topic-key-2');
    await createNewTopic(session, 'topic-key-3');
    await createNewTopic(session, 'topic-key-4');
    await createNewTopic(session, 'topic-key-5');

    // Add subscribers to one of the topics
    const subscribersService = new SubscribersService(session.organization._id, session.environment._id);
    firstSubscriber = await subscribersService.createSubscriber();
    secondSubscriber = await subscribersService.createSubscriber();

    const topicKey = 'topic-key-2';
    const subscribers = [firstSubscriber.subscriberId, secondSubscriber.subscriberId];
    await addSubscribersToTopic(session, topicKey, subscribers);

    novuClient = initNovuClassSdk(session);
  });

  it('should retrieve all topics with cursor pagination', async () => {
    const response = await session.testAgent.get(`/v2/topics?limit=3`);

    expect(response.statusCode).to.equal(200);
    expect(response.body.data.length).to.equal(3);
    expect(response.body.next).to.be.a('string');
    expect(response.body.previous).to.be.null;

    // Get the next page using the cursor
    const nextResponse = await session.testAgent.get(`/v2/topics?limit=3&after=${response.body.next}`);

    expect(nextResponse.statusCode).to.equal(200);
    expect(nextResponse.body.data.length).to.equal(2);
    expect(nextResponse.body.next).to.be.null;
    expect(nextResponse.body.previous).to.be.a('string');

    // Ensure we have 5 unique topics between the two pages
    const allTopics = [...response.body.data, ...nextResponse.body.data];
    const uniqueTopicIds = new Set(allTopics.map((topic) => topic._id));
    expect(uniqueTopicIds.size).to.equal(5);
  });

  it('should filter topics by key', async () => {
    const response = await session.testAgent.get(`/v2/topics?key=topic-key-2`);

    expect(response.statusCode).to.equal(200);
    expect(response.body.data.length).to.equal(1);
    expect(response.body.data[0].key).to.equal('topic-key-2');
  });

  it('should filter topics by name', async () => {
    const response = await session.testAgent.get(`/v2/topics?name=topic-key-3-name`);

    expect(response.statusCode).to.equal(200);
    expect(response.body.data.length).to.equal(1);
    expect(response.body.data[0].name).to.equal('topic-key-3-name');
  });

  it('should order topics by specified field', async () => {
    const response = await session.testAgent.get(`/v2/topics?orderBy=key&orderDirection=ASC`);

    expect(response.statusCode).to.equal(200);

    const keys = response.body.data.map((topic) => topic.key);
    const sortedKeys = [...keys].sort();

    expect(keys).to.deep.equal(sortedKeys);
  });

  it('should include topic fields: _id, name, key, createdAt, updatedAt', async () => {
    const response = await session.testAgent.get(`/v2/topics?limit=1`);

    expect(response.statusCode).to.equal(200);
    expect(response.body.data.length).to.equal(1);

    const topic = response.body.data[0];
    expect(topic).to.have.property('_id');
    expect(topic).to.have.property('name');
    expect(topic).to.have.property('key');
    expect(topic).to.have.property('createdAt');
    expect(topic).to.have.property('updatedAt');
  });
});

const createNewTopic = async (session: UserSession, topicKey: string) => {
  const result = await initNovuClassSdk(session).topics.create({
    key: topicKey,
    name: `${topicKey}-name`,
  });

  return result.result;
};

const addSubscribersToTopic = async (session: UserSession, topicKey: TopicKey, subscribers: ExternalSubscriberId[]) => {
  const result = await initNovuClassSdk(session).topics.subscriptions.subscribe(
    {
      subscriberIds: subscribers,
    },
    topicKey
  );

  expect(result.result.data).to.be.ok;
};
