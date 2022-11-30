import { UserSession } from '@novu/testing';
import { expect } from 'chai';

const BASE_PATH = '/v1/topics';

describe('Get a topic - /topics/:topicId (GET)', async () => {
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
    const { _id } = body.data;
    expect(_id).to.exist;
    expect(_id).to.be.string;

    const url = `${BASE_PATH}/${_id}`;
    const getResponse = await session.testAgent.get(url);

    expect(getResponse.statusCode).to.eql(200);

    const topic = getResponse.body.data;

    expect(topic._id).to.eql(_id);
    expect(topic._userId).to.eql(session.user._id);
    expect(topic._environmentId).to.eql(session.environment._id);
    expect(topic._organizationId).to.eql(session.organization._id);
    expect(topic.key).to.eql(topicKey);
    expect(topic.name).to.eql(topicName);
    expect(topic.createdAt).to.exist;
    expect(topic.updatedAt).to.exist;
  });

  it('should throw a not found error when the topic id does not exist in the database for the user requesting it', async () => {
    const nonExistingId = 'ab12345678901234567890ab';
    const { body } = await session.testAgent.get(`${BASE_PATH}/${nonExistingId}`);

    expect(body.statusCode).to.equal(404);
    expect(body.message).to.eql(`Topic not found for id ${nonExistingId} for the user ${session.user._id}`);
    expect(body.error).to.eql('Not Found');
  });
});
