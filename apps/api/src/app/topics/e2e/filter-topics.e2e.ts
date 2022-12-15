import { UserSession } from '@novu/testing';
import { expect } from 'chai';

const BASE_PATH = '/v1/topics';

const createNewTopic = async (session: UserSession, topicKey: string) => {
  return await session.testAgent.post(BASE_PATH).send({
    key: topicKey,
    name: `${topicKey}-name`,
  });
};

describe('Filter topics - /topics (GET)', async () => {
  let session: UserSession;

  before(async () => {
    session = new UserSession();
    await session.initialize();

    await createNewTopic(session, 'topic-key-1');
    await createNewTopic(session, 'topic-key-2');
    await createNewTopic(session, 'topic-key-3');
  });

  it('should return a validation error if the params provided are not in the right type', async () => {
    const url = `${BASE_PATH}?page=first&pageSize=big`;
    const response = await session.testAgent.get(url);

    expect(response.statusCode).to.eql(400);
    expect(response.body.error).to.eql('Bad Request');
    expect(response.body.message).to.eql([
      'page must be a positive number',
      'page must be an integer number',
      'pageSize must be a positive number',
      'pageSize must be an integer number',
    ]);
  });

  it('should return a validation error if the expected params provided are not integers', async () => {
    const url = `${BASE_PATH}?page=1.5&pageSize=1.5`;
    const response = await session.testAgent.get(url);

    expect(response.statusCode).to.eql(400);
    expect(response.body.error).to.eql('Bad Request');
    expect(response.body.message).to.eql(['page must be an integer number', 'pageSize must be an integer number']);
  });

  it('should return a validation error if the expected params provided are negative integers', async () => {
    const url = `${BASE_PATH}?page=-1&pageSize=-1`;
    const response = await session.testAgent.get(url);

    expect(response.statusCode).to.eql(400);
    expect(response.body.error).to.eql('Bad Request');
    expect(response.body.message).to.eql(['page must be a positive number', 'pageSize must be a positive number']);
  });

  it('should return a Bad Request error if the page size requested is bigger than the default one (100)', async () => {
    const url = `${BASE_PATH}?page=1&pageSize=101`;
    const response = await session.testAgent.get(url);

    expect(response.statusCode).to.eql(400);
    expect(response.body.error).to.eql('Bad Request');
    expect(response.body.message).to.eql('Page size can not be larger then 100');
  });

  it('should retrieve all the topics that exist in the database for the user if not query params provided', async () => {
    const url = `${BASE_PATH}`;
    const response = await session.testAgent.get(url);

    expect(response.statusCode).to.eql(200);

    const { data, totalCount, page, pageSize } = response.body;

    expect(data.length).to.eql(3);
    expect(totalCount).to.eql(3);
    expect(page).to.eql(0);
    expect(pageSize).to.eql(100);
  });

  it('should retrieve the topic filtered by the query param key for the user', async () => {
    const topicKey = 'topic-key-2';
    const url = `${BASE_PATH}?key=${topicKey}`;
    const response = await session.testAgent.get(url);

    expect(response.statusCode).to.eql(200);

    const { data, totalCount, page, pageSize } = response.body;
    const [topic] = data;

    expect(data.length).to.eql(1);
    expect(totalCount).to.eql(1);
    expect(page).to.eql(0);
    expect(pageSize).to.eql(100);
    expect(topic._userId).to.eql(session.user._id);
    expect(topic._environmentId).to.eql(session.environment._id);
    expect(topic._organizationId).to.eql(session.organization._id);
    expect(topic.key).to.eql(topicKey);
    expect(topic.createdAt).to.exist;
    expect(topic.updatedAt).to.exist;
  });

  it('should retrieve an empty response if filtering by a key that is not in the database for the user', async () => {
    const topicKey = 'topic-key-not-existing';
    const url = `${BASE_PATH}?key=${topicKey}`;
    const response = await session.testAgent.get(url);

    expect(response.statusCode).to.eql(200);

    const { data, totalCount, page, pageSize } = response.body;

    expect(data.length).to.eql(0);
    expect(totalCount).to.eql(0);
    expect(page).to.eql(0);
    expect(pageSize).to.eql(100);
  });

  it('should ignore other query params and return all the topics that belong the user', async () => {
    const url = `${BASE_PATH}?unsupportedParam=whatever`;
    const response = await session.testAgent.get(url);

    expect(response.statusCode).to.eql(200);

    const { data, totalCount, page, pageSize } = response.body;

    expect(data.length).to.eql(3);
    expect(totalCount).to.eql(3);
    expect(page).to.eql(0);
    expect(pageSize).to.eql(100);
  });
});
