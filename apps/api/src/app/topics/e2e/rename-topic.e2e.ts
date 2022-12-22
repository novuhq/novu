import { SubscribersService, UserSession } from '@novu/testing';
import { SubscriberEntity } from '@novu/dal';
import { ExternalSubscriberId, TopicId, TopicKey } from '@novu/shared';
import { expect } from 'chai';

const BASE_PATH = '/v1/topics';

describe('Rename a topic - /topics/:topicKey (PATCH)', async () => {
  const renamedTopicName = 'topic-renamed';
  const topicKey: TopicKey = 'topic-key';
  const topicName = 'topic-name';
  let firstSubscriber: SubscriberEntity;
  let secondSubscriber: SubscriberEntity;
  let session: UserSession;

  before(async () => {
    session = new UserSession();
    await session.initialize();

    const response = await session.testAgent.post(BASE_PATH).send({
      key: topicKey,
      name: topicName,
    });

    expect(response.statusCode).to.eql(201);

    const { body } = response;
    const { _id, key } = body.data;
    expect(_id).to.exist;
    expect(_id).to.be.string;
    expect(key).to.eql(topicKey);

    const subscribersService = new SubscribersService(session.organization._id, session.environment._id);
    firstSubscriber = await subscribersService.createSubscriber();
    secondSubscriber = await subscribersService.createSubscriber();
    const subscribers = [firstSubscriber.subscriberId, secondSubscriber.subscriberId];
    await addSubscribersToTopic(session, topicKey, subscribers);
  });

  it('should throw a bad request error when not providing the name field', async () => {
    const url = `${BASE_PATH}/${topicKey}`;
    const { body } = await session.testAgent.patch(url);

    expect(body.statusCode).to.equal(400);
    expect(body.error).to.eql('Bad Request');
    expect(body.message).to.eql(['name should not be null or undefined', 'name must be a string']);
  });

  it('should rename the topic and return it if exists in the database', async () => {
    const url = `${BASE_PATH}/${topicKey}`;
    const patchResponse = await session.testAgent.patch(url).send({ name: renamedTopicName });

    expect(patchResponse.statusCode).to.eql(200);

    const topic = patchResponse.body.data;

    expect(topic._environmentId).to.eql(session.environment._id);
    expect(topic._organizationId).to.eql(session.organization._id);
    expect(topic.key).to.eql(topicKey);
    expect(topic.name).to.eql(renamedTopicName);
    expect(topic.subscribers).to.have.members([firstSubscriber.subscriberId, secondSubscriber.subscriberId]);
  });

  it('should throw a not found error when the topic id provided does not exist in the database', async () => {
    const nonExistingId = 'ab12345678901234567890ab';
    const { body } = await session.testAgent.patch(`${BASE_PATH}/${nonExistingId}`).send({ name: renamedTopicName });

    expect(body.statusCode).to.equal(404);
    expect(body.message).to.eql(
      `Topic not found for id ${nonExistingId} in the environment ${session.environment._id}`
    );
    expect(body.error).to.eql('Not Found');
  });
});

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
