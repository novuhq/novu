import { SubscriberEntity } from '@novu/dal';
import { SubscribersService, UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('Add subscribers to topic - /topics/:topicKey/subscribers (POST)', async () => {
  const topicKey = 'topic-key-add-subscribers';
  const topicName = 'topic-name';
  const URL = '/v1/topics';

  let session: UserSession;
  let subscriberService: SubscribersService;
  let subscriber: SubscriberEntity;
  let secondSubscriber: SubscriberEntity;
  let thirdSubscriber: SubscriberEntity;
  let topicId: string;
  let topicUrl: string;
  let addSubscribersUrl: string;

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
    topicUrl = `${URL}/${topicKey}`;
    addSubscribersUrl = `${topicUrl}/subscribers`;
  });

  it('should throw validation error for missing request payload information', async () => {
    const { body } = await session.testAgent.post(addSubscribersUrl).send({});

    expect(body.statusCode).to.eql(400);
    expect(body.message).to.eql(['subscribers should not be null or undefined', 'subscribers must be an array']);
  });

  it('should add subscriber to topic', async () => {
    const subscribers = [subscriber.subscriberId];

    const response = await session.testAgent.post(addSubscribersUrl).send({ subscribers });

    expect(response.statusCode).to.eql(200);
    expect(response.body.data).to.eql({
      succeeded: [subscriber.subscriberId],
    });

    const getResponse = await session.testAgent.get(topicUrl);
    expect(getResponse.statusCode).to.eql(200);

    const getResponseTopic = getResponse.body.data;

    expect(getResponseTopic._id).to.eql(topicId);
    expect(getResponseTopic._environmentId).to.eql(session.environment._id);
    expect(getResponseTopic._organizationId).to.eql(session.organization._id);
    expect(getResponseTopic.key).to.eql(topicKey);
    expect(getResponseTopic.name).to.eql(topicName);
    expect(getResponseTopic.subscribers).to.eql([subscriber.subscriberId]);
  });

  it('should not add subscriber to topic if the subscriber does not exist', async () => {
    const subscribers = ['this-is-a-made-up-subscriber-id'];

    const response = await session.testAgent.post(addSubscribersUrl).send({ subscribers });

    expect(response.statusCode).to.eql(200);
    expect(response.body.data).to.eql({
      succeeded: [],
      failed: {
        notFound: subscribers,
      },
    });

    const getResponse = await session.testAgent.get(topicUrl);
    expect(getResponse.statusCode).to.eql(200);

    const getResponseTopic = getResponse.body.data;

    expect(getResponseTopic._id).to.eql(topicId);
    expect(getResponseTopic._environmentId).to.eql(session.environment._id);
    expect(getResponseTopic._organizationId).to.eql(session.organization._id);
    expect(getResponseTopic.key).to.eql(topicKey);
    expect(getResponseTopic.name).to.eql(topicName);
    expect(getResponseTopic.subscribers).to.eql([subscriber.subscriberId]);
  });

  it('should not duplicate subscribers if adding a subscriber already added to topic', async () => {
    const preconditionResponse = await session.testAgent.get(topicUrl);
    expect(preconditionResponse.statusCode).to.eql(200);
    expect(preconditionResponse.body.data.subscribers).to.eql([subscriber.subscriberId]);

    const subscribers = [subscriber.subscriberId];

    const response = await session.testAgent.post(addSubscribersUrl).send({ subscribers });

    expect(response.statusCode).to.eql(200);
    expect(response.body.data).to.eql({
      succeeded: [subscriber.subscriberId],
    });

    const getResponse = await session.testAgent.get(topicUrl);
    expect(getResponse.statusCode).to.eql(200);

    const getResponseTopic = getResponse.body.data;

    expect(getResponseTopic._id).to.eql(topicId);
    expect(getResponseTopic._environmentId).to.eql(session.environment._id);
    expect(getResponseTopic._organizationId).to.eql(session.organization._id);
    expect(getResponseTopic.key).to.eql(topicKey);
    expect(getResponseTopic.name).to.eql(topicName);
    expect(getResponseTopic.subscribers).to.eql([subscriber.subscriberId]);
  });

  it('should add multiple subscribers to topic', async () => {
    const subscribers = [secondSubscriber.subscriberId, thirdSubscriber.subscriberId];

    const response = await session.testAgent.post(addSubscribersUrl).send({ subscribers });

    expect(response.statusCode).to.eql(200);
    expect(response.body.data).to.eql({
      succeeded: subscribers,
    });

    const getResponse = await session.testAgent.get(topicUrl);
    expect(getResponse.statusCode).to.eql(200);

    const getResponseTopic = getResponse.body.data;

    expect(getResponseTopic._id).to.eql(topicId);
    expect(getResponseTopic._environmentId).to.eql(session.environment._id);
    expect(getResponseTopic._organizationId).to.eql(session.organization._id);
    expect(getResponseTopic.key).to.eql(topicKey);
    expect(getResponseTopic.name).to.eql(topicName);
    expect(getResponseTopic.subscribers).to.have.members([
      subscriber.subscriberId,
      secondSubscriber.subscriberId,
      thirdSubscriber.subscriberId,
    ]);
  });

  it('should create topic on the fly when adding existing subscriber to topic if the topic does not exist', async () => {
    const subscribers = [subscriber.subscriberId];
    const nonExistingTopicKey = 'non-existing-topic-key';
    const url = `${URL}/${nonExistingTopicKey}`;

    const response = await session.testAgent.post(`${url}/subscribers`).send({ subscribers });

    expect(response.statusCode).to.eql(200);
    expect(response.body.data).to.eql({
      succeeded: subscribers,
    });

    const getResponse = await session.testAgent.get(url);
    expect(getResponse.statusCode).to.eql(200);

    const getResponseTopic = getResponse.body.data;

    expect(getResponseTopic._id).to.be.ok;
    expect(getResponseTopic._environmentId).to.eql(session.environment._id);
    expect(getResponseTopic._organizationId).to.eql(session.organization._id);
    expect(getResponseTopic.key).to.eql(nonExistingTopicKey);
    expect(getResponseTopic.name).to.eql(`Autogenerated-${nonExistingTopicKey}`);
    expect(getResponseTopic.subscribers).to.eql(subscribers);
  });

  it('should create topic on the fly when adding non existing subscriber to topic if the topic does not exist', async () => {
    const subscribers = ['this-is-a-made-up-subscriber-id'];
    const nonExistingTopicKey = 'non-existing-topic-key-with-non-existing-subscriber';
    const url = `${URL}/${nonExistingTopicKey}`;

    const response = await session.testAgent.post(`${url}/subscribers`).send({ subscribers });

    expect(response.statusCode).to.eql(200);
    expect(response.body.data).to.eql({
      succeeded: [],
      failed: {
        notFound: subscribers,
      },
    });

    const getResponse = await session.testAgent.get(url);
    expect(getResponse.statusCode).to.eql(200);

    const getResponseTopic = getResponse.body.data;

    expect(getResponseTopic._id).to.be.ok;
    expect(getResponseTopic._environmentId).to.eql(session.environment._id);
    expect(getResponseTopic._organizationId).to.eql(session.organization._id);
    expect(getResponseTopic.key).to.eql(nonExistingTopicKey);
    expect(getResponseTopic.name).to.eql(`Autogenerated-${nonExistingTopicKey}`);
    expect(getResponseTopic.subscribers).to.eql([]);
  });
});
