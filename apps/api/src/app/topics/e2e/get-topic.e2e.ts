import { UserSession } from '@novu/testing';
import { expect } from 'chai';

const BASE_PATH = '/v1/topics';

describe('Get a topic - /topics/:topicKey (GET)', async () => {
  let session: UserSession;

  before(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should retrieve the requested topic successfully if exists in the database for that user', async () => {
    const topicKey = 'topic-key';
    const topicName = 'topic-name';
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

    const url = `${BASE_PATH}/${topicKey}`;
    const getResponse = await session.testAgent.get(url);

    expect(getResponse.statusCode).to.eql(200);

    const topic = getResponse.body.data;

    expect(topic._id).to.eql(_id);
    expect(topic._environmentId).to.eql(session.environment._id);
    expect(topic._organizationId).to.eql(session.organization._id);
    expect(topic.key).to.eql(topicKey);
    expect(topic.name).to.eql(topicName);
    expect(topic.subscribers).to.eql([]);
  });

  it('should throw a not found error when the topic key does not exist in the database for the user requesting it', async () => {
    const nonExistingTopicKey = 'ab12345678901234567890ab';
    const { body } = await session.testAgent.get(`${BASE_PATH}/${nonExistingTopicKey}`);

    expect(body.statusCode).to.equal(404);
    expect(body.message).to.eql(
      `Topic not found for id ${nonExistingTopicKey} in the environment ${session.environment._id}`
    );
    expect(body.error).to.eql('Not Found');
  });
});
