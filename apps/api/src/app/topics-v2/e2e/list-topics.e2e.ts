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
    const response = await novuClient.topics.list({
      limit: 3,
    });

    expect(response).to.exist;
    expect(response.result.data.length).to.equal(3);
    expect(response.result.next).to.be.a('string');
    expect(response.result.previous).to.be.null;

    // Get the next page using the cursor
    const nextResponse = await novuClient.topics.list({
      limit: 3,
      after: response.result.next as string,
    });

    expect(nextResponse).to.exist;
    expect(nextResponse.result.data.length).to.equal(2);
    expect(nextResponse.result.next).to.be.null;
    expect(nextResponse.result.previous).to.be.a('string');

    // Ensure we have 5 unique topics between the two pages
    const allTopics = [...response.result.data, ...nextResponse.result.data];
    const uniqueTopicIds = new Set(allTopics.map((topic) => topic.id));
    expect(uniqueTopicIds.size).to.equal(5);
  });

  it('should filter topics by key', async () => {
    const response = await novuClient.topics.list({
      key: 'topic-key-2',
    });

    expect(response).to.exist;
    expect(response.result.data.length).to.equal(1);
    expect(response.result.data[0].key).to.equal('topic-key-2');
  });

  it('should filter topics by name', async () => {
    const response = await novuClient.topics.list({
      name: 'topic-key-3-name',
    });

    expect(response).to.exist;
    expect(response.result.data.length).to.equal(1);
    expect(response.result.data[0].name).to.equal('topic-key-3-name');
  });

  it('should order topics by specified field', async () => {
    const response = await novuClient.topics.list({
      orderBy: 'key',
      orderDirection: 'ASC',
    });

    expect(response).to.exist;

    const keys = response.result.data.map((topic) => topic.key);
    const sortedKeys = [...keys].sort();

    expect(keys).to.deep.equal(sortedKeys);
  });

  it('should include topic fields: id, name, key, createdAt, updatedAt', async () => {
    const response = await novuClient.topics.list({
      limit: 1,
    });

    expect(response).to.exist;
    expect(response.result.data.length).to.equal(1);

    const topic = response.result.data[0];
    expect(topic).to.have.property('id');
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
  const result = await initNovuClassSdk(session).topics.subscriptions.create(
    {
      subscriberIds: subscribers,
    },
    topicKey
  );

  expect(result.result.data).to.be.ok;
};
