import { expect } from 'chai';
import { UserSession } from '@novu/testing';

describe('Delete Notification Group - /notification-groups/:id (DELETE)', async () => {
  let session: UserSession;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should delete notification group by id', async function () {
    const postNotificationGroup1 = await session.testAgent.post(`/v1/notification-groups`).send({
      name: 'Test delete group',
    });

    const id = postNotificationGroup1.body.data.id;

    const getResult = await session.testAgent.get(`/v1/notification-groups/${id}`);

    const group = getResult.body.data;

    expect(group.name).to.equal(`Test delete group`);
    expect(group._id).to.equal(postNotificationGroup1.body.data.id);
    expect(group._environmentId).to.equal(session.environment._id);

    const { body: deleteResult } = await session.testAgent.delete(`/v1/notification-groups/${id}`);

    expect(deleteResult.data.acknowledged).to.equal(true);
    expect(deleteResult.data.status).to.equal('deleted');

    const { body: getResultAfterDelete } = await session.testAgent.get(`/v1/notification-groups/${id}`);

    expect(getResultAfterDelete.statusCode).to.eq(404);
  });

  it('should return 404 error when attempting to delete non-existent notification group', async function () {
    const postNotificationGroup1 = await session.testAgent.post(`/v1/notification-groups`).send({
      name: 'Test name',
    });

    const id = postNotificationGroup1.body.data.id;

    await session.testAgent.delete(`/v1/notification-groups/${id}`);

    const { body } = await session.testAgent.delete(`/v1/notification-groups/${id}`);

    expect(body.statusCode).to.equal(404);
  });
});
