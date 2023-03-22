import { SubscriberEntity } from '@novu/dal';
import { SubscribersService, UserSession } from '@novu/testing';
import { expect } from 'chai';

import { ExternalSubscriberId, TopicId, TopicKey } from '../types';

const BASE_PATH = '/v1/topics';

const buildGetTopicSubscriberUrl = (topicKey: TopicKey, externalSubscriberId: ExternalSubscriberId): string =>
  `${BASE_PATH}/${topicKey}/subscribers/${externalSubscriberId}`;

describe('Check if a subscriber belongs to a topic - /topics/:topicKey/subscribers/:externalSubscriberId (GET)', () => {
  const topicKey = 'topic-key-get-topic-subscriber';
  const topicName = 'topic-name';

  let session: UserSession;
  let subscriber: SubscriberEntity;
  let externalSubscriberId: ExternalSubscriberId;
  let topicId: TopicId;

  before(async () => {
    session = new UserSession();
    await session.initialize();

    const subscriberService = new SubscribersService(session.organization._id, session.environment._id);
    subscriber = await subscriberService.createSubscriber();

    const response = await session.testAgent.post(BASE_PATH).send({
      key: topicKey,
      name: topicName,
    });

    expect(response.statusCode).to.eql(201);

    const { body } = response;
    const { _id, key } = body.data;
    expect(_id).to.exist;
    expect(_id).to.be.string;
    expect(key).to.eq(topicKey);

    topicId = _id;

    const topicUrl = `${BASE_PATH}/${topicKey}`;
    const addSubscribersUrl = `${topicUrl}/subscribers`;
    externalSubscriberId = subscriber.subscriberId;
    const subscribers = [externalSubscriberId];
    const addSubscribersResponse = await session.testAgent.post(addSubscribersUrl).send({ subscribers });
    expect(addSubscribersResponse.statusCode).to.eql(200);
    expect(addSubscribersResponse.body.data).to.eql({
      succeeded: [externalSubscriberId],
    });
  });

  it('should check the requested subscriber belongs to a topic successfully in the database for that user', async () => {
    const url = buildGetTopicSubscriberUrl(topicKey, externalSubscriberId);
    const getResponse = await session.testAgent.get(url);

    expect(getResponse.statusCode).to.eql(200);

    const topicSubscriber = getResponse.body.data;

    expect(topicSubscriber._id).to.be.ok;
    expect(topicSubscriber._environmentId).to.eql(session.environment._id);
    expect(topicSubscriber._organizationId).to.eql(session.organization._id);
    expect(topicSubscriber._subscriberId).to.eql(subscriber._id);
    expect(topicSubscriber._topicId).to.eql(topicId);
    expect(topicSubscriber.topicKey).to.eql(topicKey);
    expect(topicSubscriber.externalSubscriberId).to.eql(externalSubscriberId);
  });

  it('should throw a not found error when the external subscriber id passed does not belong to the chosen topic', async () => {
    const nonExistingExternalSubscriberId = 'ab12345678901234567890ab';
    const url = buildGetTopicSubscriberUrl(topicKey, nonExistingExternalSubscriberId);
    const { body } = await session.testAgent.get(url);

    expect(body.statusCode).to.equal(404);
    expect(body.message).to.eql(
      `Subscriber ${nonExistingExternalSubscriberId} not found for topic ${topicKey} in the environment ${session.environment._id}`
    );
    expect(body.error).to.eql('Not Found');
  });

  it('should throw a not found error when the topic key does not exist in the database for the call', async () => {
    const nonExistingTopicKey = 'ab12345678901234567890ab';
    const url = buildGetTopicSubscriberUrl(nonExistingTopicKey, externalSubscriberId);
    const { body } = await session.testAgent.get(url);

    expect(body.statusCode).to.equal(404);
    expect(body.message).to.eql(
      `Subscriber ${externalSubscriberId} not found for topic ${nonExistingTopicKey} in the environment ${session.environment._id}`
    );
    expect(body.error).to.eql('Not Found');
  });
});
