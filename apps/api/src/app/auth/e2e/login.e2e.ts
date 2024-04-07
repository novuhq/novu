import { UserSession } from '@novu/testing';
import * as jwt from 'jsonwebtoken';
import { subMinutes } from 'date-fns';
import { expect } from 'chai';
import { IJwtPayload } from '@novu/shared';
import { UserRepository } from '@novu/dal';

describe('User login - /auth/login (POST)', async () => {
  let session: UserSession;
  const userRepository = new UserRepository();
  const userCredentials = {
    email: 'Testy.test22@gmail.com',
    password: '123Qwerty@',
  };

  context('with email/password', async () => {
    before(async () => {
      session = new UserSession();
      await session.initialize();

      const { body } = await session.testAgent
        .post('/v1/auth/register')
        .send({
          email: userCredentials.email,
          password: userCredentials.password,
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(201);
    });

    it('should login the user correctly', async () => {
      const { body } = await session.testAgent.post('/v1/auth/login').send({
        email: userCredentials.email,
        password: userCredentials.password,
      });

      const jwtContent = (await jwt.decode(body.data.token)) as IJwtPayload;

      expect(jwtContent.firstName).to.equal('test');
      expect(jwtContent.lastName).to.equal('user');
      expect(jwtContent.email).to.equal('testytest22@gmail.com');
    });

    it('should login the user correctly with uppercase email', async () => {
      const { body } = await session.testAgent.post('/v1/auth/login').send({
        email: userCredentials.email.toUpperCase(),
        password: userCredentials.password,
      });

      const jwtContent = (await jwt.decode(body.data.token)) as IJwtPayload;

      expect(jwtContent.firstName).to.equal('test');
      expect(jwtContent.lastName).to.equal('user');
      expect(jwtContent.email).to.equal('testytest22@gmail.com');
    });

    it('should throw error on trying to login non-existing user', async () => {
      const { body } = await session.testAgent.post('/v1/auth/login').send({
        email: 'nonExistingUser@email.com',
        password: '123123213123',
      });

      expect(body.statusCode).to.equal(401);
      expect(body.message).to.contain('Incorrect email or password provided.');
    });

    it('should fail on bad password', async () => {
      const { body } = await session.testAgent.post('/v1/auth/login').send({
        email: userCredentials.email,
        password: '123123213123',
      });

      expect(body.statusCode).to.equal(401);
      expect(body.message).to.contain('Incorrect email or password provided.');
    });

    it('should allow user to log in and reset the failed attempts counter after less than 5 failed attempts within 5 minutes', async () => {
      const SAFE_FAILED_LOGIN_ATTEMPTS = 3;

      for (let i = 0; i < SAFE_FAILED_LOGIN_ATTEMPTS; i++) {
        await session.testAgent.post('/v1/auth/login').send({
          email: userCredentials.email,
          password: 'wrong-password',
        });
      }

      const { body } = await session.testAgent.post('/v1/auth/login').send({
        email: userCredentials.email,
        password: userCredentials.password,
      });

      const jwtContent = (await jwt.decode(body.data.token)) as IJwtPayload;

      expect(jwtContent.firstName).to.equal('test');
      expect(jwtContent.lastName).to.equal('user');
      expect(jwtContent.email).to.equal('testytest22@gmail.com');

      const { body: wrongCredsBody } = await session.testAgent.post('/v1/auth/login').send({
        email: userCredentials.email,
        password: 'wrong-password',
      });

      expect(wrongCredsBody.statusCode).to.equal(401);
      expect(wrongCredsBody.message).to.contain('Incorrect email or password provided.');
    });

    it('should block the user account after 5 unsuccessful attempts within 5 minutes', async () => {
      const MAX_LOGIN_ATTEMPTS = 5;

      for (let i = 0; i < MAX_LOGIN_ATTEMPTS; i++) {
        await session.testAgent.post('/v1/auth/login').send({
          email: userCredentials.email,
          password: 'wrong-password',
        });
      }

      const { body } = await session.testAgent.post('/v1/auth/login').send({
        email: userCredentials.email,
        password: userCredentials.password,
      });

      expect(body.statusCode).to.equal(401);
      expect(body.message).to.contain('Account blocked');
    });

    it('should reset the account blocked error after 5 minutes and allow for more 5 failed attempts', async () => {
      const MAX_LOGIN_ATTEMPTS = 5;
      const BLOCKED_PERIOD_IN_MINUTES = 5;

      const lastFailedAttempt = subMinutes(new Date(), BLOCKED_PERIOD_IN_MINUTES);

      const failedLogin = {
        lastFailedAttempt: lastFailedAttempt.toISOString(),
        times: MAX_LOGIN_ATTEMPTS,
      };

      await userRepository.update(
        {
          _id: session.user._id,
        },
        {
          $set: {
            failedLogin,
          },
        }
      );

      for (let i = 0; i < MAX_LOGIN_ATTEMPTS - 1; i++) {
        const { body } = await session.testAgent.post('/v1/auth/login').send({
          email: session.user.email,
          password: 'wrong-password',
        });

        expect(body.message).to.contain('Incorrect email or password provided.');
        expect(body.statusCode).to.equal(401);
      }

      const { body } = await session.testAgent.post('/v1/auth/login').send({
        email: userCredentials.email,
        password: userCredentials.password,
      });

      expect(body.statusCode).to.equal(401);
      expect(body.message).to.contain('Account blocked');
    });
  });

  context('with OAuth', async () => {
    const userEmail = 'testoauth@gmail.com';

    before(async () => {
      // Create a mock OAuth user without a password
      await userRepository.create({
        email: userEmail,
        firstName: 'Testy',
        lastName: 'Oauth',
      });
    });

    it('should throw an error informing the user to use OAuth instead', async () => {
      const { body } = await session.testAgent.post('/v1/auth/login').send({
        email: userEmail,
        password: 'whatever',
      });

      expect(body.statusCode).to.equal(400);
      expect(body.message).to.contain('Please sign in using Github.');
    });
  });
});
