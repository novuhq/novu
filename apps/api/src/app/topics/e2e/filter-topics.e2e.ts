import { SubscribersService, UserSession } from '@novu/testing';
import { SubscriberEntity, TopicSubscribersRepository } from '@novu/dal';
import { ExternalSubscriberId, TopicKey } from '@novu/shared';
import { expect } from 'chai';

import { Novu } from '@novu/api';
import { CreateTopicResponseDto } from '@novu/api/models/components';
import { TopicsControllerAssignResponse } from '@novu/api/models/operations';
import { initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Filter topics - /topics (GET) #novu-v2', async () => {
  let firstSubscriber: SubscriberEntity;
  let secondSubscriber: SubscriberEntity;
  let session: UserSession;
  let novuClient: Novu;
  before(async () => {
    session = new UserSession();
    await session.initialize();

    await createNewTopic(session, 'topic-key-1');

    const secondTopicKey = 'topic-key-2';
    await createNewTopic(session, secondTopicKey);
    const subscribersService = new SubscribersService(session.organization._id, session.environment._id);
    firstSubscriber = await subscribersService.createSubscriber();
    secondSubscriber = await subscribersService.createSubscriber();
    const subscribers = [firstSubscriber.subscriberId, secondSubscriber.subscriberId];
    await addSubscribersToTopic(session, secondTopicKey, subscribers);

    await createNewTopic(session, 'topic-key-3');

    const topicSubscribersRepository = new TopicSubscribersRepository();
    const result = await topicSubscribersRepository.find({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      topicKey: secondTopicKey,
    });

    expect(result.length).to.eql(subscribers.length);
    expect(subscribers).to.have.members(result.map((subscriber) => subscriber.externalSubscriberId));
    novuClient = initNovuClassSdk(session);
  });

  it('should return a validation error if the params provided are not in the right type', async () => {
    const response = await session.testAgent.get(`/v1/topics?page=first&pageSize=big`);
    expect(response.statusCode).to.eql(422);
    expect(response.body.errors.page.messages, JSON.stringify(response.body)).to.include.members([
      'page must be an integer number',
    ]);
    expect(response.body.errors.pageSize.messages, JSON.stringify(response.body)).to.include.members([
      'pageSize must be an integer number',
    ]);
  });

  it('should return a validation error if the expected params provided are not integers', async () => {
    const url = `/v1/topics?page=1.5&pageSize=1.5`;
    const response = await session.testAgent.get(url);

    expect(response.statusCode).to.eql(422);
    expect(response.body.message, JSON.stringify(response.body)).to.eql('Validation failed');
    expect(response.body.errors.page.messages).to.include.members(['page must be an integer number']);
    expect(response.body.errors.pageSize.messages).to.include.members(['pageSize must be an integer number']);
  });

  it('should return a validation error if the expected params provided are negative integers', async () => {
    const url = `/v1/topics?page=-1&pageSize=-1`;
    const response = await session.testAgent.get(url);

    expect(response.statusCode).to.eql(422);
    expect(response.body.errors.page.messages, JSON.stringify(response.body)).to.include.members([
      'page must not be less than 0',
    ]);
    expect(response.body.errors.pageSize.messages, JSON.stringify(response.body)).to.include.members([
      'pageSize must not be less than 0',
    ]);
  });

  it('should return a Bad Request error if the page size requested is bigger than the default one (10)', async () => {
    const url = `/v1/topics?page=1&pageSize=101`;
    const response = await session.testAgent.get(url);

    expect(response.statusCode).to.eql(422);
    expect(response.body.errors.pageSize.messages, JSON.stringify(response.body)).to.include.members([
      'pageSize must not be greater than 10',
    ]);
  });

  it('should retrieve all the topics that exist in the database for the user if not query params provided', async () => {
    const response = await novuClient.topics.list({});
    const { data, totalCount, page, pageSize } = response.result;

    expect(data.length).to.eql(3);
    expect(totalCount).to.eql(3);
    expect(page).to.eql(0);
    expect(pageSize).to.eql(10);
  });

  it('should retrieve the topic filtered by the query param key for the user', async () => {
    const topicKey = 'topic-key-2';
    const response = await novuClient.topics.list({ key: topicKey });
    const { data, totalCount, page, pageSize } = response.result;
    const [topic] = data;

    expect(data.length).to.eql(1);
    expect(totalCount).to.eql(1);
    expect(page).to.eql(0);
    expect(pageSize).to.eql(10);
    expect(topic.environmentId).to.eql(session.environment._id);
    expect(topic.organizationId).to.eql(session.organization._id);
    expect(topic.key).to.eql(topicKey);
    expect(topic.subscribers).to.have.members([firstSubscriber.subscriberId, secondSubscriber.subscriberId]);
  });

  it('should retrieve an empty response if filtering by a key that is not in the database for the user', async () => {
    const topicKey = 'topic-key-not-existing';
    const response = await novuClient.topics.list({ key: topicKey });

    const { data, totalCount, page, pageSize } = response.result;

    expect(data.length).to.eql(0);
    expect(totalCount).to.eql(0);
    expect(page).to.eql(0);
    expect(pageSize).to.eql(10);
  });

  it('should ignore other query params and return all the topics that belong the user', async () => {
    const url = `/v1/topics?unsupportedParam=whatever`;
    const response = await session.testAgent.get(url);

    expect(response.statusCode).to.eql(200);

    const { data, totalCount, page, pageSize } = response.body;

    expect(data.length).to.eql(3);
    expect(totalCount).to.eql(3);
    expect(page).to.eql(0);
    expect(pageSize).to.eql(10);
  });

  it('should retrieve two topics from the database for the environment if pageSize is set to 2 and page 0 selected', async () => {
    const response = await novuClient.topics.list({ page: 0, pageSize: 2 });
    const { data, totalCount, page, pageSize } = response.result;

    expect(data.length).to.eql(2);
    expect(totalCount).to.eql(3);
    expect(page).to.eql(0);
    expect(pageSize).to.eql(2);

    expect(data[0].name).to.eql('topic-key-1-name');
    expect(data[1].name).to.eql('topic-key-2-name');
  });

  it('should retrieve one topic from the database for the environment if pageSize is set to 2 and page 1 selected', async () => {
    const response = await novuClient.topics.list({ page: 1, pageSize: 2 });

    const { data, totalCount, page, pageSize } = response.result;

    expect(data.length).to.eql(1);
    expect(totalCount).to.eql(3);
    expect(page).to.eql(1);
    expect(pageSize).to.eql(2);

    expect(data[0].name).to.eql('topic-key-3-name');
  });

  it('should retrieve zero topics from the database for the environment if pageSize is set to 2 and page 2 selected', async () => {
    const response = await novuClient.topics.list({ page: 2, pageSize: 2 });

    const { data, totalCount, page, pageSize } = response.result;

    expect(data.length).to.eql(0);
    expect(totalCount).to.eql(3);
    expect(page).to.eql(2);
    expect(pageSize).to.eql(2);
  });
});

const createNewTopic = async (session: UserSession, topicKey: string): Promise<CreateTopicResponseDto> => {
  const result = await initNovuClassSdk(session).topics.create({
    key: topicKey,
    name: `${topicKey}-name`,
  });

  return result.result;
};

const addSubscribersToTopic = async (
  session: UserSession,
  topicKey: TopicKey,
  subscribers: ExternalSubscriberId[]
): Promise<TopicsControllerAssignResponse> => {
  const result = await initNovuClassSdk(session).topics.subscribers.assign(
    {
      subscribers,
    },
    topicKey
  );

  expect(result.result).to.eql({
    succeeded: subscribers,
  });

  return result;
};
