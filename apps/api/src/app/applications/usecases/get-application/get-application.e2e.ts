import { ApplicationRepository } from '@notifire/dal';
import { UserSession } from '@notifire/testing';
import { expect } from 'chai';

describe('Get Application - /applications/me (GET)', async () => {
  let session: UserSession;

  before(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should return correct application to user', async () => {
    const { body } = await session.testAgent.get('/v1/applications/me');

    expect(body.data.name).to.eq(session.application.name);
    expect(body.data._organizationId).to.eq(session.organization._id);
    expect(body.data.identifier).to.equal(session.application.identifier);
  });
});
