import { PreferenceLevelEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('Update global preferences - /inbox/preferences (PATCH)', function () {
  let session: UserSession;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should throw error when made unauthorized call', async function () {
    const response = await session.testAgent
      .patch(`/v1/inbox/preferences`)
      .send({
        email: true,
        in_app: true,
        sms: false,
        push: false,
        chat: true,
      })
      .set('Authorization', `Bearer InvalidToken`);

    expect(response.status).to.equal(401);
  });

  it('should update global preferences', async function () {
    const response = await session.testAgent
      .patch('/v1/inbox/preferences')
      .send({
        email: true,
        in_app: true,
        sms: false,
        push: false,
        chat: true,
      })
      .set('Authorization', `Bearer ${session.subscriberToken}`);

    expect(response.status).to.equal(200);
    expect(response.body.data.preferences.channels.email).to.equal(true);
    expect(response.body.data.preferences.channels.in_app).to.equal(true);
    expect(response.body.data.preferences.channels.sms).to.equal(false);
    expect(response.body.data.preferences.channels.push).to.equal(false);
    expect(response.body.data.preferences.channels.chat).to.equal(true);
    expect(response.body.data.level).to.equal(PreferenceLevelEnum.GLOBAL);
  });

  it('should update the particular channel sent in the body and return all channels', async function () {
    const response = await session.testAgent
      .patch('/v1/inbox/preferences')
      .send({
        email: true,
        in_app: true,
        sms: false,
        push: false,
        chat: true,
      })
      .set('Authorization', `Bearer ${session.subscriberToken}`);

    expect(response.status).to.equal(200);
    expect(response.body.data.preferences.channels.email).to.equal(true);
    expect(response.body.data.preferences.channels.in_app).to.equal(true);
    expect(response.body.data.preferences.channels.sms).to.equal(false);
    expect(response.body.data.preferences.channels.push).to.equal(false);
    expect(response.body.data.preferences.channels.chat).to.equal(true);
    expect(response.body.data.level).to.equal(PreferenceLevelEnum.GLOBAL);

    const responseSecond = await session.testAgent
      .patch('/v1/inbox/preferences')
      .send({
        email: false,
        in_app: true,
      })
      .set('Authorization', `Bearer ${session.subscriberToken}`);

    expect(responseSecond.status).to.equal(200);
    expect(responseSecond.body.preferences.channels.email).to.equal(false);
    expect(responseSecond.body.preferences.channels.in_app).to.equal(true);
    expect(responseSecond.body.preferences.channels.sms).to.equal(false);
    expect(responseSecond.body.preferences.channels.push).to.equal(false);
    expect(responseSecond.body.preferences.channels.chat).to.equal(true);
    expect(responseSecond.body.level).to.equal(PreferenceLevelEnum.GLOBAL);
  });
});

describe('Update workflow preferences - /inbox/preferences/:workflowId (PATCH)', function () {
  let session: UserSession;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should throw error when made unauthorized call', async function () {
    const workflow = await session.createTemplate({
      noFeedId: true,
    });

    const response = await session.testAgent
      .patch(`/v1/inbox/preferences/${workflow._id}`)
      .send({
        email: true,
        in_app: true,
        sms: false,
        push: false,
        chat: true,
      })
      .set('Authorization', `Bearer InvalidToken`);

    expect(response.status).to.equal(401);
  });

  it('should throw error when non-existing workflow id is passed', async function () {
    const response = await session.testAgent
      .patch(`/v1/inbox/preferences/1234`)
      .send({
        email: true,
        in_app: true,
        sms: false,
        push: false,
        chat: true,
      })
      .set('Authorization', `Bearer ${session.subscriberToken}`);

    expect(response.status).to.equal(404);
    expect(response.body.data.message).to.equal('Workflow with id: 1234 is not found');
  });

  it('should update workflow preferences', async function () {
    const workflow = await session.createTemplate({
      noFeedId: true,
    });

    const response = await session.testAgent
      .patch(`/v1/inbox/preferences/${workflow._id}`)
      .send({
        email: true,
        in_app: true,
        sms: false,
        push: false,
        chat: true,
      })
      .set('Authorization', `Bearer ${session.subscriberToken}`);

    expect(response.status).to.equal(200);
    expect(response.body.data.preferences.channels.email).to.equal(true);
    expect(response.body.data.preferences.channels.in_app).to.equal(true);
    expect(response.body.data.preferences.channels.sms).to.equal(false);
    expect(response.body.data.preferences.channels.push).to.equal(false);
    expect(response.body.data.preferences.channels.chat).to.equal(true);
    expect(response.body.data.level).to.equal(PreferenceLevelEnum.TEMPLATE);
  });

  it('should update the particular channel sent in the body and return all channels', async function () {
    const workflow = await session.createTemplate({
      noFeedId: true,
    });

    const response = await session.testAgent
      .patch(`/v1/inbox/preferences/${workflow._id}`)
      .send({
        email: true,
        in_app: true,
        sms: false,
        push: false,
        chat: true,
      })
      .set('Authorization', `Bearer ${session.subscriberToken}`);

    expect(response.status).to.equal(200);
    expect(response.body.data.preferences.channels.email).to.equal(true);
    expect(response.body.data.preferences.channels.in_app).to.equal(true);
    expect(response.body.data.preferences.channels.sms).to.equal(false);
    expect(response.body.data.preferences.channels.push).to.equal(false);
    expect(response.body.data.preferences.channels.chat).to.equal(true);
    expect(response.body.data.level).to.equal(PreferenceLevelEnum.TEMPLATE);

    const responseSecond = await session.testAgent
      .patch(`/v1/inbox/preferences/${workflow._id}`)
      .send({
        email: false,
        in_app: true,
      })
      .set('Authorization', `Bearer ${session.subscriberToken}`);

    expect(responseSecond.status).to.equal(200);
    expect(responseSecond.body.preferences.channels.email).to.equal(false);
    expect(responseSecond.body.preferences.channels.in_app).to.equal(true);
    expect(responseSecond.body.preferences.channels.sms).to.equal(false);
    expect(responseSecond.body.preferences.channels.push).to.equal(false);
    expect(responseSecond.body.preferences.channels.chat).to.equal(true);
    expect(responseSecond.body.level).to.equal(PreferenceLevelEnum.TEMPLATE);
  });
});
