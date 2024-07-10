import { UserRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { v4 as uuidv4 } from 'uuid';
import { expect } from 'chai';
import { stub, SinonStubbedMember } from 'sinon';
import { subDays, subMinutes } from 'date-fns';
import { PasswordResetFlowEnum } from '@novu/shared';

describe('Password reset - /auth/reset (POST)', async () => {
  let session: UserSession;
  const userRepository = new UserRepository();

  const requestResetToken = async (payload) => {
    let plainToken: string;
    /*
     * Wrapper for method to obtain plain reset token before hashing.
     * Stub is created on Prototype because API and tests use different UserRepository instances.
     */
    stub(UserRepository.prototype, 'updatePasswordResetToken').callsFake((...args) => {
      plainToken = args[1];
      (
        UserRepository.prototype.updatePasswordResetToken as SinonStubbedMember<
          typeof UserRepository.prototype.updatePasswordResetToken
        >
      ).restore();

      return userRepository.updatePasswordResetToken(...args);
    });

    const { body } = await session.testAgent.post('/v1/auth/reset/request').send(payload);

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return { body, plainToken: plainToken! };
  };

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should request a password reset for existing user with no query param', async () => {
    const { body } = await session.testAgent.post('/v1/auth/reset/request').send({
      email: session.user.email,
    });

    expect(body.data.success).to.equal(true);
    const found = await userRepository.findById(session.user._id);

    expect(found.resetToken).to.be.ok;
  });

  Object.values(PasswordResetFlowEnum)
    .map(String)
    .forEach((src) => {
      it(`should request a password reset for existing user with a src query param specified: ${src}`, async () => {
        const url = `/v1/auth/reset/request?src=${src}`;
        const { body } = await session.testAgent.post(url).send({
          email: session.user.email,
        });

        expect(body.data.success).to.equal(true);
        const found = await userRepository.findById(session.user._id);

        expect(found.resetToken).to.be.ok;
      });
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
    const { body, plainToken } = await requestResetToken({
      email: session.user.email,
    });

    expect(body.data.success).to.equal(true);

    const found = await userRepository.findById(session.user._id);
    expect(plainToken).to.not.equal(found.resetToken);

    const { body: resetChange } = await session.testAgent.post('/v1/auth/reset').send({
      password: 'ASd3ASD$Fdfdf',
      token: plainToken,
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
    const { body } = await requestResetToken({
      email: session.user.email,
    });

    expect(body.data.success).to.equal(true);

    const { body: resetChange } = await session.testAgent.post('/v1/auth/reset').send({
      password: 'ASd3ASD$Fdfdf',
      token: uuidv4(),
    });

    expect(resetChange.message).to.contain('Bad token provided');
  });

  it('should fail to change password for expired token', async () => {
    const { body, plainToken } = await requestResetToken({
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

    const { body: resetChange } = await session.testAgent.post('/v1/auth/reset').send({
      password: 'ASd3ASD$Fdfdf',
      token: plainToken,
    });

    expect(resetChange.message).to.contain('Token has expired');
  });

  it('should limit password request to 5 requests per minute', async () => {
    const MAX_ATTEMPTS = 5;

    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      await session.testAgent.post('/v1/auth/reset/request').send({
        email: session.user.email,
      });
    }

    const { body } = await session.testAgent.post('/v1/auth/reset/request').send({
      email: session.user.email,
    });

    expect(body.statusCode).to.equal(401);
    expect(body.message).to.contain('Too many requests, Try again after a minute.');
  });

  it('should limit password request to 15 requests per day', async () => {
    const MAX_ATTEMPTS = 5;

    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      await session.testAgent.post('/v1/auth/reset/request').send({
        email: session.user.email,
      });
    }

    await userRepository.update(
      {
        _id: session.user._id,
      },
      {
        $set: {
          resetTokenCount: {
            reqInMinute: 0,
            reqInDay: 10,
          },
        },
      }
    );

    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      await session.testAgent.post('/v1/auth/reset/request').send({
        email: session.user.email,
      });
    }

    const { body } = await session.testAgent.post('/v1/auth/reset/request').send({
      email: session.user.email,
    });

    expect(body.statusCode).to.equal(401);
    expect(body.message).to.contain('Too many requests, Try again after 24 hours.');
  });

  it('should allow user to request password reset after 1 minute block period', async () => {
    const MAX_ATTEMPTS = 5;

    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      await session.testAgent.post('/v1/auth/reset/request').send({
        email: session.user.email,
      });
    }

    await userRepository.update(
      {
        _id: session.user._id,
      },
      {
        $set: {
          resetTokenDate: subMinutes(new Date(), 1),
        },
      }
    );

    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      const { body } = await session.testAgent.post('/v1/auth/reset/request').send({
        email: session.user.email,
      });

      expect(body.data.success).to.equal(true);
      const found = await userRepository.findById(session.user._id);

      expect(found.resetToken).to.be.ok;
    }
  });

  it('should allow user to request password reset after 24 hours block period', async () => {
    const MAX_ATTEMPTS = 5;

    await session.testAgent.post('/v1/auth/reset/request').send({
      email: session.user.email,
    });

    await userRepository.update(
      {
        _id: session.user._id,
      },
      {
        $set: {
          resetTokenDate: subDays(new Date(), 1),
          resetTokenCount: {
            reqInMinute: 5,
            reqInDay: 15,
          },
        },
      }
    );

    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      const { body } = await session.testAgent.post('/v1/auth/reset/request').send({
        email: session.user.email,
      });

      expect(body.data.success).to.equal(true);
      const found = await userRepository.findById(session.user._id);

      expect(found.resetToken).to.be.ok;
    }
  });

  it("should throw error when the password doesn't meets the requirements", async () => {
    const { body, plainToken } = await requestResetToken({
      email: session.user.email,
    });

    expect(body.data.success).to.equal(true);

    const foundUser = await userRepository.findById(session.user._id);

    const { body: resetChange } = await session.testAgent.post('/v1/auth/reset').send({
      password: 'password',
      token: plainToken,
    });

    expect(plainToken).to.not.equal(foundUser.resetToken);
    expect(resetChange.message[0]).to.contain(
      // eslint-disable-next-line max-len
      'The password must contain minimum 8 and maximum 64 characters, at least one uppercase letter, one lowercase letter, one number and one special character #?!@$%^&*()-'
    );
  });
});
