import { expect } from 'chai';
import { UserSession } from '@novu/testing';

describe('Get Feeds - /feeds (GET)', async () => {
  let session: UserSession;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should get all feeds', async function () {
    await session.testAgent.post(`/v1/feeds`).send({
      name: 'Test name',
    });
    await session.testAgent.post(`/v1/feeds`).send({
      name: 'Test name 2',
    });

    const { body } = await session.testAgent.get(`/v1/feeds`);

    expect(body.data.length).to.equal(2);
    const group = body.data.find((i) => i.name === 'Test name');

    expect(group.name).to.equal(`Test name`);
    expect(group._environmentId).to.equal(session.environment._id);
  });
});
