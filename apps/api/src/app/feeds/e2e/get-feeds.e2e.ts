import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('Get Feeds - /feeds (GET) #novu-v0', async () => {
  let session: UserSession;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should get all feeds', async () => {
    await session.testAgent.post(`/v1/feeds`).send({
      name: 'Test name',
    });
    await session.testAgent.post(`/v1/feeds`).send({
      name: 'Test name 2',
    });

    const { body } = await session.testAgent.get(`/v1/feeds`);

    expect(body.data.length).to.equal(4);
    const feed = body.data.find((i) => i.name === 'Test name');

    expect(feed.name).to.equal(`Test name`);
    expect(feed._environmentId).to.equal(session.environment._id);
  });

  it('should create default feed if none exists', async () => {
    const { body } = await session.testAgent.get(`/v1/feeds`);
    expect(body.data.length).to.equal(2);
    const defaultFeed = body.data[0];

    expect(defaultFeed.name).to.equal(`Activities`);

    await session.testAgent.post(`/v1/feeds`).send({
      name: 'Feed 2',
    });
    const { body: newBody } = await session.testAgent.get(`/v1/feeds`);

    expect(newBody.data.length).to.equal(3);
    const feed = newBody.data.find((i) => i.name === 'Feed 2');

    expect(feed.name).to.equal(`Feed 2`);
    expect(feed._environmentId).to.equal(session.environment._id);
  });
});
