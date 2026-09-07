import { Novu } from '@novu/api';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Upsert topic - /v2/topics (POST) #novu-v2', async () => {
  let session: UserSession;
  let novuClient: Novu;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();

    novuClient = initNovuClassSdk(session);
  });

  it('should create a new topic when it does not exist', async () => {
    const key = `topic-key-${Date.now()}`;
    const name = 'Test Topic Name';

    const response = await novuClient.topics.create({
      key,
      name,
    });

    expect(response.result).to.exist;
    expect(response.result).to.have.property('id');
    expect(response.result.key).to.equal(key);
    expect(response.result.name).to.equal(name);
    expect(response.result).to.have.property('createdAt');
    expect(response.result).to.have.property('updatedAt');
  });

  it('should create a topic with custom data', async () => {
    const key = `topic-key-data-${Date.now()}`;
    const name = 'Topic With Data';
    const data = { category: 'product', priority: 1, tags: ['a', 'b'] };

    const { body } = await session.testAgent.post('/v2/topics').send({ key, name, data });

    expect(body.data).to.exist;
    expect(body.data.key).to.equal(key);
    expect(body.data.name).to.equal(name);
    expect(body.data.data).to.deep.equal(data);
  });

  it('should reject topic data larger than 64KB', async () => {
    const key = `topic-key-oversized-${Date.now()}`;
    const oversizedValue = 'x'.repeat(65 * 1024);

    const { body } = await session.testAgent.post('/v2/topics').send({
      key,
      name: 'Oversized',
      data: { big: oversizedValue },
    });

    expect(body.statusCode).to.equal(422);
    expect(JSON.stringify(body)).to.match(/too large|Data is too large|Validation Error/i);
  });

  it('should reject nested objects in topic data', async () => {
    const key = `topic-key-nested-${Date.now()}`;

    const { body } = await session.testAgent.post('/v2/topics').send({
      key,
      name: 'Nested',
      data: { nested: { not: 'allowed' } },
    });

    expect(body.statusCode).to.equal(422);
    expect(JSON.stringify(body)).to.match(/must be a string, number, boolean, or string\[\]/i);
  });

  it('should update an existing topic when it already exists', async () => {
    const key = `topic-key-${Date.now()}`;
    const originalName = 'Original Name';

    const createResponse = await novuClient.topics.create({
      key,
      name: originalName,
    });

    expect(createResponse.result).to.exist;
    const originalId = createResponse.result.id;

    const updatedName = 'Updated Name';
    const updateResponse = await novuClient.topics.update(
      {
        name: updatedName,
      },
      key
    );

    expect(updateResponse.result).to.exist;
    expect(updateResponse.result.id).to.equal(originalId);
    expect(updateResponse.result.key).to.equal(key);
    expect(updateResponse.result.name).to.equal(updatedName);
    const getResponse = await novuClient.topics.get(key);
    expect(getResponse.result.name).to.equal(updatedName);
  });

  it('should update topic data on upsert when topic already exists', async () => {
    const key = `topic-key-upsert-data-${Date.now()}`;

    await session.testAgent.post('/v2/topics').send({
      key,
      name: 'Original',
      data: { category: 'old' },
    });

    const { body } = await session.testAgent.post('/v2/topics').send({
      key,
      name: 'Updated',
      data: { category: 'new', priority: 2 },
    });

    expect(body.data.name).to.equal('Updated');
    expect(body.data.data).to.deep.equal({ category: 'new', priority: 2 });
  });
});
