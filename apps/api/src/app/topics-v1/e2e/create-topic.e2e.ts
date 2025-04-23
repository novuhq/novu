import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { Novu } from '@novu/api';
import { expectSdkExceptionGeneric, initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Topic creation - /topics (POST) #novu-v2', async () => {
  let session: UserSession;
  let novuClient: Novu;

  before(async () => {
    session = new UserSession();
    await session.initialize();
    novuClient = initNovuClassSdk(session);
  });

  it('should throw validation error for missing request payload information', async () => {
    const { body } = await session.testAgent.post('/v1/topics').send({});

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
    const response = await novuClient.topics.create({
      key: topicKey,
      name: topicName,
    });

    expect(response.result.id).to.exist;
    expect(response.result.id).to.be.string;
    expect(response.result.key).to.eql(topicKey);
  });

  it('should throw an error when trying to create a topic with a key already used', async () => {
    const topicKey = 'topic-key-unique';
    const topicName = 'topic-name';
    const response = await novuClient.topics.create({
      key: topicKey,
      name: topicName,
    });

    const body = response.result;
    expect(body.id).to.exist;
    expect(body.id).to.be.string;
    expect(body.key).to.eql(topicKey);

    const conflictResponse = await expectSdkExceptionGeneric(() =>
      novuClient.topics.create(
        {
          key: topicKey,
          name: topicName,
        },
        undefined,
        { retryCodes: ['404'] }
      )
    );
    expect(conflictResponse.error).to.be.ok;
    if (conflictResponse.error) {
      expect(conflictResponse.error.statusCode).to.eql(409);
      expect(conflictResponse.error.ctx?.error).to.eql('Conflict');
      expect(conflictResponse.error.message).to.eql(
        `Topic exists with key ${topicKey} in the environment ${session.environment._id} of the organization ${session.organization._id}`
      );
    }
  });
});
