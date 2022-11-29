import { UserRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { subDays } from 'date-fns';

describe('Password reset - /auth/reset (POST)', async () => {
  let session: UserSession;
  const userRepository = new UserRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should request a password reset for existing user', async () => {
    const { body } = await session.testAgent.post('/v1/auth/reset/request').send({
      email: session.user.email,
    });

    expect(body.data.success).to.equal(true);
    const found = await userRepository.findById(session.user._id);

    expect(found.resetToken).to.be.ok;
  });

  it('should request a password reset for existing user with uppercase email', async () => {
    const { body } = await session.testAgent.post('/v1/auth/reset/request').send({
      email: session.user.email.toUpperCase(),
    });

    expect(body.data.success).to.equal(true);
    const found = await userRepository.findById(session.user._id);

    expect(found.resetToken).to.be.ok;
  });

  it('should change a password after reset', async () => {
    const { body } = await session.testAgent.post('/v1/auth/reset/request').send({
      email: session.user.email,
    });

    expect(body.data.success).to.equal(true);
    const foundUser = await userRepository.findById(session.user._id);

    const { body: resetChange } = await session.testAgent.post('/v1/auth/reset').send({
      password: 'ASd3ASD$Fdfdf',
      token: foundUser.resetToken,
    });

    expect(resetChange.data.token).to.be.ok;

    /**
     * RLD-68
     * A workaround due to a potential race condition between token reset and new password login
     */
    await new Promise((resolve) => setTimeout(resolve, 100));

    const { body: loginBody } = await session.testAgent.post('/v1/auth/login').send({
      email: session.user.email,
      password: 'ASd3ASD$Fdfdf',
    });

    // RLD-68 A debug case to catch the error state message origin
    if (!loginBody || !loginBody.data) {
      // eslint-disable-next-line no-console
      console.info(loginBody);
    }

    expect(loginBody.data.token).to.be.ok;

    const foundUserAfterChange = await userRepository.findById(session.user._id);

    expect(foundUserAfterChange.resetToken).to.not.be.ok;
    expect(foundUserAfterChange.resetTokenDate).to.not.be.ok;
  });

  it('should fail to change password for bad token', async () => {
    const { body } = await session.testAgent.post('/v1/auth/reset/request').send({
      email: session.user.email,
    });

    expect(body.data.success).to.equal(true);
    await userRepository.update(
      {
        _id: session.user._id,
      },
      {
        $set: {
          resetTokenDate: subDays(new Date(), 20),
        },
      }
    );

    const foundUser = await userRepository.findById(session.user._id);

    const { body: resetChange } = await session.testAgent.post('/v1/auth/reset').send({
      password: 'ASd3ASD$Fdfdf',
      token: foundUser.resetToken,
    });

    expect(resetChange.message).to.contain('Token has expired');
  });
});
