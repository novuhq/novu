import { SubscriberEntity } from '@novu/dal';
import { TopicId } from '@novu/shared';
import { SubscribersService, UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('Remove subscribers to topic - /topics/:topicKey/subscribers/removal (POST)', async () => {
  const topicKey = 'topic-key-remove-subscribers';
  const topicName = 'topic-name';
  const URL = '/v1/topics';

  let session: UserSession;
  let subscriberService: SubscribersService;
  let subscriber: SubscriberEntity;
  let secondSubscriber: SubscriberEntity;
  let thirdSubscriber: SubscriberEntity;
  let topicId: TopicId;
  let getTopicUrl: string;
  let removeSubscribersUrl: string;

  before(async () => {
    session = new UserSession();
    await session.initialize();

    subscriberService = new SubscribersService(session.organization._id, session.environment._id);
    subscriber = await subscriberService.createSubscriber();
    secondSubscriber = await subscriberService.createSubscriber();
    thirdSubscriber = await subscriberService.createSubscriber();

    const response = await session.testAgent.post(URL).send({
      key: topicKey,
      name: topicName,
    });
    expect(response.statusCode).to.eql(201);
    topicId = response.body.data._id;
    expect(topicId).to.exist;
    expect(response.body.data.key).to.eql(topicKey);

    getTopicUrl = `${URL}/${topicKey}`;
    const addSubscribersUrl = `${getTopicUrl}/subscribers`;
    removeSubscribersUrl = `${addSubscribersUrl}/removal`;

    // We prefill the data to work with
    await session.testAgent
      .post(addSubscribersUrl)
      .send({ subscribers: [subscriber.subscriberId, secondSubscriber.subscriberId, thirdSubscriber.subscriberId] });
  });

  it('should throw validation error for missing request payload information', async () => {
    const { body } = await session.testAgent.post(removeSubscribersUrl).send({});

    expect(body.statusCode).to.eql(400);
    expect(body.message).to.eql(['subscribers should not be null or undefined', 'subscribers must be an array']);
  });

  it('should remove subscriber from the topic', async () => {
    const subscribers = [subscriber.subscriberId];

    const response = await session.testAgent.post(removeSubscribersUrl).send({ subscribers });

    expect(response.statusCode).to.eql(204);
    expect(response.body).to.be.empty;

    const getResponse = await session.testAgent.get(getTopicUrl);
    expect(getResponse.statusCode).to.eql(200);

    const getResponseTopic = getResponse.body.data;

    expect(getResponseTopic._id).to.eql(topicId);
    expect(getResponseTopic._environmentId).to.eql(session.environment._id);
    expect(getResponseTopic._organizationId).to.eql(session.organization._id);
    expect(getResponseTopic.key).to.eql(topicKey);
    expect(getResponseTopic.name).to.eql(topicName);
    expect(getResponseTopic.subscribers).to.have.members([secondSubscriber.subscriberId, thirdSubscriber.subscriberId]);
  });

  it('should not remove subscriber from topic if it does not exist', async () => {
    const subscribers = ['this-is-a-made-up-subscriber-id'];

    const response = await session.testAgent.post(removeSubscribersUrl).send({ subscribers });

    expect(response.statusCode).to.eql(204);
    expect(response.body).to.be.empty;

    const getResponse = await session.testAgent.get(getTopicUrl);
    expect(getResponse.statusCode).to.eql(200);

    const getResponseTopic = getResponse.body.data;

    expect(getResponseTopic._id).to.eql(topicId);
    expect(getResponseTopic._environmentId).to.eql(session.environment._id);
    expect(getResponseTopic._organizationId).to.eql(session.organization._id);
    expect(getResponseTopic.key).to.eql(topicKey);
    expect(getResponseTopic.name).to.eql(topicName);
    expect(getResponseTopic.subscribers).to.have.members([secondSubscriber.subscriberId, thirdSubscriber.subscriberId]);
  });

  it('should keep the same when trying to remove a subscriber already removed from the topic', async () => {
    const subscribers = [subscriber.subscriberId];

    const response = await session.testAgent.post(removeSubscribersUrl).send({ subscribers });

    expect(response.statusCode).to.eql(204);
    expect(response.body).to.be.empty;

    const getResponse = await session.testAgent.get(getTopicUrl);
    expect(getResponse.statusCode).to.eql(200);

    const getResponseTopic = getResponse.body.data;

    expect(getResponseTopic._id).to.eql(topicId);
    expect(getResponseTopic._environmentId).to.eql(session.environment._id);
    expect(getResponseTopic._organizationId).to.eql(session.organization._id);
    expect(getResponseTopic.key).to.eql(topicKey);
    expect(getResponseTopic.name).to.eql(topicName);
    expect(getResponseTopic.subscribers).to.have.members([secondSubscriber.subscriberId, thirdSubscriber.subscriberId]);
  });

  it('should remove multiple subscribers from the topic', async () => {
    const subscribers = [secondSubscriber.subscriberId, thirdSubscriber.subscriberId];

    const response = await session.testAgent.post(removeSubscribersUrl).send({ subscribers });

    expect(response.statusCode).to.eql(204);
    expect(response.body).to.be.empty;

    const getResponse = await session.testAgent.get(getTopicUrl);
    expect(getResponse.statusCode).to.eql(200);

    const getResponseTopic = getResponse.body.data;

    expect(getResponseTopic._id).to.eql(topicId);
    expect(getResponseTopic._environmentId).to.eql(session.environment._id);
    expect(getResponseTopic._organizationId).to.eql(session.organization._id);
    expect(getResponseTopic.key).to.eql(topicKey);
    expect(getResponseTopic.name).to.eql(topicName);
    expect(getResponseTopic.subscribers).to.eql([]);
  });

  it('should remove subscriber from only one topic', async () => {
    // create a new topics
    const newTopicKey1 = 'new-topic-key1';
    const newTopicKey2 = 'new-topic-key2';
    await session.testAgent.post(URL).send({
      key: newTopicKey1,
      name: topicName,
    });
    await session.testAgent.post(URL).send({
      key: newTopicKey2,
      name: topicName,
    });

    // add subscribers to the new topics
    await session.testAgent
      .post(`${URL}/${newTopicKey1}/subscribers`)
      .send({ subscribers: [subscriber.subscriberId, secondSubscriber.subscriberId, thirdSubscriber.subscriberId] });
    await session.testAgent
      .post(`${URL}/${newTopicKey2}/subscribers`)
      .send({ subscribers: [subscriber.subscriberId, secondSubscriber.subscriberId] });

    // remove subscriber from the new topic 1
    const response = await session.testAgent
      .post(`${URL}/${newTopicKey1}/subscribers/removal`)
      .send({ subscribers: [subscriber.subscriberId] });

    expect(response.statusCode).to.eql(204);
    expect(response.body).to.be.empty;

    // get topics and subscribers
    const getTopicsResponse = await session.testAgent.get(URL);
    expect(getTopicsResponse.statusCode).to.eql(200);

    const topics = getTopicsResponse.body.data;

    // check subscribers
    const topic1Subscribers = topics.find((topic) => topic.key === newTopicKey1)?.subscribers ?? [];
    const topic2Subscribers = topics.find((topic) => topic.key === newTopicKey2)?.subscribers ?? [];

    expect(topic1Subscribers).to.have.members([secondSubscriber.subscriberId, thirdSubscriber.subscriberId]);
    expect(topic2Subscribers).to.have.members([subscriber.subscriberId, secondSubscriber.subscriberId]);
  });

  it('should remove multiple subscribers from only one topic', async () => {
    // create a new topics
    const newTopicKey1 = 'new-topic-key3';
    const newTopicKey2 = 'new-topic-key4';
    await session.testAgent.post(URL).send({
      key: newTopicKey1,
      name: topicName,
    });
    await session.testAgent.post(URL).send({
      key: newTopicKey2,
      name: topicName,
    });

    // add subscribers to the new topics
    await session.testAgent
      .post(`${URL}/${newTopicKey1}/subscribers`)
      .send({ subscribers: [subscriber.subscriberId, secondSubscriber.subscriberId, thirdSubscriber.subscriberId] });
    await session.testAgent
      .post(`${URL}/${newTopicKey2}/subscribers`)
      .send({ subscribers: [subscriber.subscriberId, secondSubscriber.subscriberId] });

    // remove subscriber from the new topic 1
    const response = await session.testAgent
      .post(`${URL}/${newTopicKey1}/subscribers/removal`)
      .send({ subscribers: [subscriber.subscriberId, secondSubscriber.subscriberId] });

    expect(response.statusCode).to.eql(204);
    expect(response.body).to.be.empty;

    // get topics and subscribers
    const getTopicsResponse = await session.testAgent.get(URL);
    expect(getTopicsResponse.statusCode).to.eql(200);

    const topics = getTopicsResponse.body.data;

    // check subscribers
    const topic1Subscribers = topics.find((topic) => topic.key === newTopicKey1)?.subscribers ?? [];
    const topic2Subscribers = topics.find((topic) => topic.key === newTopicKey2)?.subscribers ?? [];

    expect(topic1Subscribers).to.have.members([thirdSubscriber.subscriberId]);
    expect(topic2Subscribers).to.have.members([subscriber.subscriberId, secondSubscriber.subscriberId]);
  });
});
