import { expect } from 'chai';
import { UserSession } from '@novu/testing';

describe('Update Notification Group - /notification-groups/:id (PATCH)', async () => {
  let session: UserSession;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('update the notification group by id', async function () {
    const postNotificationGroup = await session.testAgent.post(`/v1/notification-groups`).send({
      name: 'Test name 1',
    });

    const id = postNotificationGroup.body.data.id;

    const { body: getNotificationGroupResult } = await session.testAgent.get(`/v1/notification-groups/${id}`);

    expect(getNotificationGroupResult.data.name).to.equal(`Test name 1`);
    expect(getNotificationGroupResult.data._id).to.equal(postNotificationGroup.body.data.id);
    expect(getNotificationGroupResult.data._environmentId).to.equal(session.environment._id);

    const { body: putNotificationGroup } = await session.testAgent.patch(`/v1/notification-groups/${id}`).send({
      name: 'Updated name',
    });

    expect(putNotificationGroup.data._id).to.equal(id);

    const { body: getUpdatedNotificationGroupResult } = await session.testAgent.get(`/v1/notification-groups/${id}`);

    expect(getUpdatedNotificationGroupResult.data.name).to.equal(`Updated name`);
    expect(getUpdatedNotificationGroupResult.data.id).to.equal(id);
    expect(getUpdatedNotificationGroupResult.data._environmentId).to.equal(session.environment._id);
  });

  it('should return a 404 error if the notification group to be updated does not exist', async function () {
    const postNotificationGroup1 = await session.testAgent.post(`/v1/notification-groups`).send({
      name: 'Test name',
    });

    const id = postNotificationGroup1.body.data.id;

    await session.testAgent.delete(`/v1/notification-groups/${id}`);

    const { body } = await session.testAgent.patch(`/v1/notification-groups/${id}`).send({
      name: 'Updated name',
    });

    expect(body.statusCode).to.equal(404);
  });
});
