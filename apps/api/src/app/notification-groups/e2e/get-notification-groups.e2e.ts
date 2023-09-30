import { expect } from 'chai';
import { UserSession } from '@novu/testing';

describe('Get Notification Groups - /notification-groups (GET)', async () => {
  let session: UserSession;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should get all notification groups', async function () {
    await session.testAgent.post(`/v1/notification-groups`).send({
      name: 'Test name',
    });
    await session.testAgent.post(`/v1/notification-groups`).send({
      name: 'Test name 2',
    });

    const { body } = await session.testAgent.get(`/v1/notification-groups`);

    expect(body.data.length).to.equal(3);
    const group = body.data.find((i) => i.name === 'Test name');

    expect(group.name).to.equal(`Test name`);
    expect(group._environmentId).to.equal(session.environment._id);
  });
});
