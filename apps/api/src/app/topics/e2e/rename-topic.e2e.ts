import { SubscribersService, UserSession } from '@novu/testing';
import { TopicKey } from '@novu/shared';
import { expect } from 'chai';
import { Novu } from '@novu/api';
import { beforeEach } from 'mocha';
import { expectSdkExceptionGeneric, initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

const BASE_PATH = '/v1/topics';

describe('Rename a topic - /topics/:topicKey (PATCH) #novu-v2', async () => {
  const renamedTopicName = 'topic-renamed';
  const topicKey: TopicKey = 'topic-key';
  const topicName = 'topic-name';
  let session: UserSession;
  let novuClient: Novu;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    novuClient = initNovuClassSdk(session);
  });

  it('should throw a bad request error when not providing the name field', async () => {
    await createTopicSubscriberAndAttach();
    const url = `${BASE_PATH}/${topicKey}`;
    const { body } = await session.testAgent.patch(url);

    expect(body.statusCode).to.equal(400);
    expect(body.error).to.eql('Bad Request');
    expect(body.message).to.eql(['name should not be null or undefined', 'name must be a string']);
  });

  it('should rename the topic and return it if exists in the database', async () => {
    const newVar = await createTopicSubscriberAndAttach();
    const patchResponse = await novuClient.topics.rename({ name: renamedTopicName }, topicKey);
    const topic = patchResponse.result;

    expect(topic.environmentId).to.eql(session.environment._id);
    expect(topic.organizationId).to.eql(session.organization._id);
    expect(topic.key).to.eql(topicKey);
    expect(topic.name).to.eql(renamedTopicName);
    expect(topic.subscribers).to.have.members([
      newVar.firstSubscriber.subscriberId,
      newVar.secondSubscriber.subscriberId,
    ]);
  });

  it('should throw a not found error when the topic id provided does not exist in the database', async () => {
    await createTopicSubscriberAndAttach();
    const nonExistingId = 'ab12345678901234567890ab';
    const { error } = await expectSdkExceptionGeneric(() =>
      novuClient.topics.rename({ name: renamedTopicName }, nonExistingId)
    );
    expect(error).to.be.ok;
    if (error) {
      expect(error.statusCode).to.equal(404);
      expect(error.message).to.eql(
        `Topic not found for id ${nonExistingId} in the environment ${session.environment._id}`
      );
    }
  });
  async function createTopicSubscriberAndAttach() {
    const response = await novuClient.topics.create({
      key: topicKey,
      name: topicName,
    });

    const { result } = response;
    const { id, key } = result;
    expect(id).to.exist;
    expect(id).to.be.string;
    expect(key).to.eql(topicKey);

    const subscribersService = new SubscribersService(session.organization._id, session.environment._id);
    const firstSubscriber = await subscribersService.createSubscriber();
    const secondSubscriber = await subscribersService.createSubscriber();
    const subscribers = [firstSubscriber.subscriberId, secondSubscriber.subscriberId];
    const controllerAssignResponse = await novuClient.topics.subscribers.assign(
      {
        subscribers,
      },
      topicKey
    );
    expect(controllerAssignResponse.result).to.eql({
      succeeded: subscribers,
    });

    return { firstSubscriber, secondSubscriber };
  }
});
