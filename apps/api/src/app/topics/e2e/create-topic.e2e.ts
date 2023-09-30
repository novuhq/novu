import { UserSession } from '@novu/testing';
import { expect } from 'chai';

const URL = '/v1/topics';

describe('Topic creation - /topics (POST)', async () => {
  let session: UserSession;

  before(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should throw validation error for missing request payload information', async () => {
    const { body } = await session.testAgent.post(URL).send({});

    expect(body.statusCode).to.equal(400);
    expect(body.message.find((i) => i.includes('key'))).to.be.ok;
    expect(body.message.find((i) => i.includes('name'))).to.be.ok;
    expect(body.message).to.eql([
      'key should not be null or undefined',
      'key must be a string',
      'name should not be null or undefined',
      'name must be a string',
    ]);
  });

  it('should create a new topic successfully', async () => {
    const topicKey = 'topic-key';
    const topicName = 'topic-name';
    const response = await session.testAgent.post(URL).send({
      key: topicKey,
      name: topicName,
    });

    expect(response.statusCode).to.eql(201);

    const { body } = response;
    expect(body.data._id).to.exist;
    expect(body.data._id).to.be.string;
    expect(body.data.key).to.eql(topicKey);
  });

  it('should throw an error when trying to create a topic with a key already used', async () => {
    const topicKey = 'topic-key-unique';
    const topicName = 'topic-name';
    const response = await session.testAgent.post(URL).send({
      key: topicKey,
      name: topicName,
    });

    expect(response.statusCode).to.eql(201);

    const { body } = response;
    expect(body.data._id).to.exist;
    expect(body.data._id).to.be.string;
    expect(body.data.key).to.eql(topicKey);

    const conflictResponse = await session.testAgent.post(URL).send({
      key: topicKey,
      name: topicName,
    });

    expect(conflictResponse.statusCode).to.eql(409);
    expect(conflictResponse.body.error).to.eql('Conflict');
    expect(conflictResponse.body.message).to.eql(
      `Topic exists with key ${topicKey} in the environment ${session.environment._id} of the organization ${session.organization._id}`
    );
  });
});
