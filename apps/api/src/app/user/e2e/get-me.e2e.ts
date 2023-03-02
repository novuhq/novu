import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('User Profile', async () => {
  let session: UserSession;

  before(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should return a correct user profile', async () => {
    const { body } = await session.testAgent.get('/v1/users/me').expect(200);

    const me = body.data;

    expect(me._id).to.equal(session.user._id);
    expect(me.firstName).to.equal(session.user.firstName);
    expect(me.lastName).to.equal(session.user.lastName);
    expect(me.email).to.equal(session.user.email);
  });
});
