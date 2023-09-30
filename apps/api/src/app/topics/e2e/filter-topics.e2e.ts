import { SubscribersService, UserSession } from '@novu/testing';
import { SubscriberEntity, TopicSubscribersRepository } from '@novu/dal';
import { ExternalSubscriberId, TopicKey } from '@novu/shared';
import { expect } from 'chai';

import { CreateTopicResponseDto } from '../dtos';

const BASE_PATH = '/v1/topics';

describe('Filter topics - /topics (GET)', async () => {
  let firstSubscriber: SubscriberEntity;
  let secondSubscriber: SubscriberEntity;
  let session: UserSession;

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
  });

  it('should return a validation error if the params provided are not in the right type', async () => {
    const url = `${BASE_PATH}?page=first&pageSize=big`;
    const response = await session.testAgent.get(url);

    expect(response.statusCode).to.eql(400);
    expect(response.body.error).to.eql('Bad Request');
    expect(response.body.message).to.eql([
      'page must not be less than 0',
      'page must be an integer number',
      'pageSize must not be less than 0',
      'pageSize must be an integer number',
    ]);
  });

  it('should return a validation error if the expected params provided are not integers', async () => {
    const url = `${BASE_PATH}?page=1.5&pageSize=1.5`;
    const response = await session.testAgent.get(url);

    expect(response.statusCode).to.eql(400);
    expect(response.body.error).to.eql('Bad Request');
    expect(response.body.message).to.eql(['page must be an integer number', 'pageSize must be an integer number']);
  });

  it('should return a validation error if the expected params provided are negative integers', async () => {
    const url = `${BASE_PATH}?page=-1&pageSize=-1`;
    const response = await session.testAgent.get(url);

    expect(response.statusCode).to.eql(400);
    expect(response.body.error).to.eql('Bad Request');
    expect(response.body.message).to.eql(['page must not be less than 0', 'pageSize must not be less than 0']);
  });

  it('should return a Bad Request error if the page size requested is bigger than the default one (10)', async () => {
    const url = `${BASE_PATH}?page=1&pageSize=101`;
    const response = await session.testAgent.get(url);

    expect(response.statusCode).to.eql(400);
    expect(response.body.error).to.eql('Bad Request');
    expect(response.body.message).to.eql('Page size can not be larger then 10');
  });

  it('should retrieve all the topics that exist in the database for the user if not query params provided', async () => {
    const url = `${BASE_PATH}`;
    const response = await session.testAgent.get(url);

    expect(response.statusCode).to.eql(200);

    const { data, totalCount, page, pageSize } = response.body;

    expect(data.length).to.eql(3);
    expect(totalCount).to.eql(3);
    expect(page).to.eql(0);
    expect(pageSize).to.eql(10);
  });

  it('should retrieve the topic filtered by the query param key for the user', async () => {
    const topicKey = 'topic-key-2';
    const url = `${BASE_PATH}?key=${topicKey}`;
    const response = await session.testAgent.get(url);

    expect(response.statusCode).to.eql(200);

    const { data, totalCount, page, pageSize } = response.body;
    const [topic] = data;

    expect(data.length).to.eql(1);
    expect(totalCount).to.eql(1);
    expect(page).to.eql(0);
    expect(pageSize).to.eql(10);
    expect(topic._environmentId).to.eql(session.environment._id);
    expect(topic._organizationId).to.eql(session.organization._id);
    expect(topic.key).to.eql(topicKey);
    expect(topic.subscribers).to.have.members([firstSubscriber.subscriberId, secondSubscriber.subscriberId]);
  });

  it('should retrieve an empty response if filtering by a key that is not in the database for the user', async () => {
    const topicKey = 'topic-key-not-existing';
    const url = `${BASE_PATH}?key=${topicKey}`;
    const response = await session.testAgent.get(url);

    expect(response.statusCode).to.eql(200);

    const { data, totalCount, page, pageSize } = response.body;

    expect(data.length).to.eql(0);
    expect(totalCount).to.eql(0);
    expect(page).to.eql(0);
    expect(pageSize).to.eql(10);
  });

  it('should ignore other query params and return all the topics that belong the user', async () => {
    const url = `${BASE_PATH}?unsupportedParam=whatever`;
    const response = await session.testAgent.get(url);

    expect(response.statusCode).to.eql(200);

    const { data, totalCount, page, pageSize } = response.body;

    expect(data.length).to.eql(3);
    expect(totalCount).to.eql(3);
    expect(page).to.eql(0);
    expect(pageSize).to.eql(10);
  });

  it('should retrieve two topics from the database for the environment if pageSize is set to 2 and page 0 selected', async () => {
    const url = `${BASE_PATH}?page=0&pageSize=2`;
    const response = await session.testAgent.get(url);

    expect(response.statusCode).to.eql(200);

    const { data, totalCount, page, pageSize } = response.body;

    expect(data.length).to.eql(2);
    expect(totalCount).to.eql(3);
    expect(page).to.eql(0);
    expect(pageSize).to.eql(2);

    expect(data[0].name).to.eql('topic-key-1-name');
    expect(data[1].name).to.eql('topic-key-2-name');
  });

  it('should retrieve one topic from the database for the environment if pageSize is set to 2 and page 1 selected', async () => {
    const url = `${BASE_PATH}?page=1&pageSize=2`;
    const response = await session.testAgent.get(url);

    expect(response.statusCode).to.eql(200);

    const { data, totalCount, page, pageSize } = response.body;

    expect(data.length).to.eql(1);
    expect(totalCount).to.eql(3);
    expect(page).to.eql(1);
    expect(pageSize).to.eql(2);

    expect(data[0].name).to.eql('topic-key-3-name');
  });

  it('should retrieve zero topics from the database for the environment if pageSize is set to 2 and page 2 selected', async () => {
    const url = `${BASE_PATH}?page=2&pageSize=2`;
    const response = await session.testAgent.get(url);

    expect(response.statusCode).to.eql(200);

    const { data, totalCount, page, pageSize } = response.body;

    expect(data.length).to.eql(0);
    expect(totalCount).to.eql(3);
    expect(page).to.eql(2);
    expect(pageSize).to.eql(2);
  });
});

const createNewTopic = async (session: UserSession, topicKey: string): Promise<CreateTopicResponseDto> => {
  const result = await session.testAgent
    .post(BASE_PATH)
    .send({
      key: topicKey,
      name: `${topicKey}-name`,
    })
    .set('Accept', 'application/json')
    .expect('Content-Type', /json/);

  expect(result.status).to.eql(201);

  const { _id, key } = result.body.data;

  return {
    _id,
    key,
  };
};

const addSubscribersToTopic = async (
  session: UserSession,
  topicKey: TopicKey,
  subscribers: ExternalSubscriberId[]
): Promise<void> => {
  const url = `${BASE_PATH}/${topicKey}/subscribers`;

  const result = await session.testAgent
    .post(url)
    .send({
      subscribers,
    })
    .set('Accept', 'application/json');

  expect(result.status).to.eql(200);
  expect(result.body.data).to.eql({
    succeeded: subscribers,
  });
};
