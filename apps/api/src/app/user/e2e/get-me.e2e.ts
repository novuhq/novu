import { CommunityUserRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('User Profile #novu-v0-os', async () => {
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

  it('should not expose password reset token fields', async () => {
    await session.testAgent.post('/v1/auth/reset/request').send({
      email: session.user.email,
    });

    const found = await new CommunityUserRepository().findById(session.user._id);

    expect(found?.resetToken).to.be.ok;
    expect(found?.resetTokenDate).to.be.ok;

    const { body } = await session.testAgent.get('/v1/users/me').expect(200);

    expect(body.data.resetToken).to.be.undefined;
    expect(body.data.resetTokenDate).to.be.undefined;
  });
});
