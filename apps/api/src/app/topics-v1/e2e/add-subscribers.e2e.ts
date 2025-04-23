import { SubscriberEntity } from '@novu/dal';
import { SubscribersService, UserSession } from '@novu/testing';
import { expect } from 'chai';
import { Novu } from '@novu/api';
import { initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Add subscribers to topic - /topics/:topicKey/subscribers (POST) #novu-v2', async () => {
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
  let novuClient: Novu;

  before(async () => {
    session = new UserSession();
    await session.initialize();

    subscriberService = new SubscribersService(session.organization._id, session.environment._id);
    subscriber = await subscriberService.createSubscriber();
    secondSubscriber = await subscriberService.createSubscriber();
    thirdSubscriber = await subscriberService.createSubscriber();
    novuClient = initNovuClassSdk(session);

    const response = await novuClient.topics.create({
      key: topicKey,
      name: topicName,
    });

    topicId = response.result.id!;
    expect(topicId).to.exist;
    topicUrl = `${URL}/${topicKey}`;
    addSubscribersUrl = `${topicUrl}/subscribers`;
  });
  it('should throw validation error for missing request payload information', async () => {
    // Not changing to use SDK since the SDK would block wrong usage
    const { body } = await session.testAgent.post(addSubscribersUrl).send({});

    expect(body.statusCode).to.eql(400);
    expect(body.message).to.eql(['subscribers should not be null or undefined', 'subscribers must be an array']);
  });

  it('should add subscriber to topic', async () => {
    const subscribers = [subscriber.subscriberId];

    const response = await novuClient.topics.subscribers.assign({ subscribers }, topicKey);

    expect(response.result).to.eql({
      succeeded: [subscriber.subscriberId],
    });

    const getResponse = await novuClient.topics.retrieve(topicKey);

    const getResponseTopic = getResponse.result;

    expect(getResponseTopic.id).to.eql(topicId);
    expect(getResponseTopic.environmentId).to.eql(session.environment._id);
    expect(getResponseTopic.organizationId).to.eql(session.organization._id);
    expect(getResponseTopic.key).to.eql(topicKey);
    expect(getResponseTopic.name).to.eql(topicName);
    expect(getResponseTopic.subscribers).to.eql([subscriber.subscriberId]);
  });

  it('should not add subscriber to topic if the subscriber does not exist', async () => {
    const response = await novuClient.topics.subscribers.assign(
      { subscribers: ['this-is-a-made-up-subscriber-id'] },
      topicKey
    );

    expect(response.result).to.eql({
      succeeded: [],
      failed: {
        notFound: ['this-is-a-made-up-subscriber-id'],
      },
    });

    const getResponse = await novuClient.topics.retrieve(topicKey);
    const getResponseTopic = getResponse.result;

    expect(getResponseTopic.id).to.eql(topicId);
    expect(getResponseTopic.environmentId).to.eql(session.environment._id);
    expect(getResponseTopic.organizationId).to.eql(session.organization._id);
    expect(getResponseTopic.key).to.eql(topicKey);
    expect(getResponseTopic.name).to.eql(topicName);
    expect(getResponseTopic.subscribers).to.eql([subscriber.subscriberId]);
  });

  it('should not duplicate subscribers if adding a subscriber already added to topic', async () => {
    const preconditionResponse = await novuClient.topics.retrieve(topicKey);
    expect(preconditionResponse.result.subscribers).to.eql([subscriber.subscriberId]);

    const response = await novuClient.topics.subscribers.assign({ subscribers: [subscriber.subscriberId] }, topicKey);

    expect(response.result).to.eql({
      succeeded: [subscriber.subscriberId],
    });

    const getResponse = await novuClient.topics.retrieve(topicKey);

    const getResponseTopic = getResponse.result;

    expect(getResponseTopic.id).to.eql(topicId);
    expect(getResponseTopic.environmentId).to.eql(session.environment._id);
    expect(getResponseTopic.organizationId).to.eql(session.organization._id);
    expect(getResponseTopic.key).to.eql(topicKey);
    expect(getResponseTopic.name).to.eql(topicName);
    expect(getResponseTopic.subscribers).to.eql([subscriber.subscriberId]);
  });

  it('should add multiple subscribers to topic', async () => {
    const subscribers = [secondSubscriber.subscriberId, thirdSubscriber.subscriberId];

    const response = await novuClient.topics.subscribers.assign({ subscribers }, topicKey);

    expect(response.result).to.eql({
      succeeded: subscribers,
    });

    const getResponse = await novuClient.topics.retrieve(topicKey);

    const getResponseTopic = getResponse.result;

    expect(getResponseTopic.id).to.eql(topicId);
    expect(getResponseTopic.environmentId).to.eql(session.environment._id);
    expect(getResponseTopic.organizationId).to.eql(session.organization._id);
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

    const response = await novuClient.topics.subscribers.assign({ subscribers }, nonExistingTopicKey);

    expect(response.result).to.eql({
      succeeded: subscribers,
    });

    const getResponse = await novuClient.topics.retrieve(nonExistingTopicKey);

    const getResponseTopic = getResponse.result;

    expect(getResponseTopic.id).to.be.ok;
    expect(getResponseTopic.environmentId).to.eql(session.environment._id);
    expect(getResponseTopic.organizationId).to.eql(session.organization._id);
    expect(getResponseTopic.key).to.eql(nonExistingTopicKey);
    expect(getResponseTopic.name).to.eql(`Autogenerated-${nonExistingTopicKey}`);
    expect(getResponseTopic.subscribers).to.eql(subscribers);
  });

  it('should create topic on the fly when adding non existing subscriber to topic if the topic does not exist', async () => {
    const subscribers = ['this-is-a-made-up-subscriber-id'];
    const nonExistingTopicKey = 'non-existing-topic-key-with-non-existing-subscriber';

    const response = await novuClient.topics.subscribers.assign({ subscribers }, nonExistingTopicKey);

    expect(response.result).to.eql({
      succeeded: [],
      failed: {
        notFound: subscribers,
      },
    });

    const getResponse = await novuClient.topics.retrieve(nonExistingTopicKey);

    const getResponseTopic = getResponse.result;

    expect(getResponseTopic.id).to.be.ok;
    expect(getResponseTopic.environmentId).to.eql(session.environment._id);
    expect(getResponseTopic.organizationId).to.eql(session.organization._id);
    expect(getResponseTopic.key).to.eql(nonExistingTopicKey);
    expect(getResponseTopic.name).to.eql(`Autogenerated-${nonExistingTopicKey}`);
    expect(getResponseTopic.subscribers).to.eql([]);
  });
});
