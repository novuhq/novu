import { expect } from 'chai';
import { UserSession } from '@novu/testing';

describe('Create A Feed - /feeds (POST)', async () => {
  let session: UserSession;

  before(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should create a new feed', async function () {
    const testFeed = {
      name: 'Test name',
    };

    const { body } = await session.testAgent.post(`/v1/feeds`).send(testFeed);

    expect(body.data).to.be.ok;
    const feed = body.data;

    expect(feed.name).to.equal(`Test name`);
    expect(feed._environmentId).to.equal(session.environment._id);
  });
});
