import { IJwtPayload } from '@novu/shared';
import { CYPRESS_USER_PASSWORD, UserSession } from '@novu/testing';
import { expect } from 'chai';
import * as jwt from 'jsonwebtoken';

const NEW_PASSWORD = 'newPassword123@';
const PASSWORD_ERROR_MESSAGE =
  'The new password must contain minimum 8 and maximum 64 characters,' +
  ' at least one uppercase letter, one lowercase letter, one number and one special character #?!@$%^&*()-';

describe('User update password - /auth/update-password (POST)', async () => {
  let session: UserSession;

  before(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should update password', async () => {
    const { statusCode } = await session.testAgent.post('/v1/auth/update-password').send({
      currentPassword: CYPRESS_USER_PASSWORD,
      newPassword: NEW_PASSWORD,
      confirmPassword: NEW_PASSWORD,
    });

    expect(statusCode).to.equal(204);

    const { body: loginBody } = await session.testAgent.post('/v1/auth/login').send({
      email: session.user.email,
      password: NEW_PASSWORD,
    });

    const jwtContent = (await jwt.decode(loginBody.data.token)) as IJwtPayload;

    expect(jwtContent.firstName).to.equal(session.user.firstName);
    expect(jwtContent.lastName).to.equal(session.user.lastName);
    expect(jwtContent.email).to.equal(session.user.email);
  });

  it('should fail on bad current password', async () => {
    const { body } = await session.testAgent.post('/v1/auth/update-password').send({
      currentPassword: '123123213',
      newPassword: NEW_PASSWORD,
      confirmPassword: NEW_PASSWORD,
    });

    expect(body.statusCode).to.equal(401);
    expect(body.message).to.contain('Unauthorized');
  });

  it('should fail on mismatched passwords', async () => {
    const { body } = await session.testAgent.post('/v1/auth/update-password').send({
      currentPassword: CYPRESS_USER_PASSWORD,
      newPassword: NEW_PASSWORD,
      confirmPassword: '123123213',
    });

    expect(body.statusCode).to.equal(400);
    expect(body.message).to.contain('Passwords do not match');
  });

  it('should fail on bad password', async () => {
    const { body: validLengthBody } = await session.testAgent.post('/v1/auth/update-password').send({
      currentPassword: CYPRESS_USER_PASSWORD,
      newPassword: '12345678',
      confirmPassword: '12345678',
    });

    expect(validLengthBody.statusCode).to.equal(400);
    expect(validLengthBody.message[0]).to.equal(PASSWORD_ERROR_MESSAGE);
  });

  it('should fail on password missing upper case letter', async () => {
    const { body } = await session.testAgent.post('/v1/auth/update-password').send({
      currentPassword: CYPRESS_USER_PASSWORD,
      newPassword: 'abcde@12345',
      confirmPassword: 'abcde@12345',
    });

    expect(body.statusCode).to.equal(400);
    expect(body.message[0]).to.equal(PASSWORD_ERROR_MESSAGE);
  });

  it('should fail on password missing lower case letter', async () => {
    const { body } = await session.testAgent.post('/v1/auth/update-password').send({
      currentPassword: CYPRESS_USER_PASSWORD,
      newPassword: 'ABCDE@12345',
      confirmPassword: 'ABCDE@12345',
    });

    expect(body.statusCode).to.equal(400);
    expect(body.message[0]).to.equal(PASSWORD_ERROR_MESSAGE);
  });

  it('should fail on password missing special characters', async () => {
    const { body } = await session.testAgent.post('/v1/auth/update-password').send({
      currentPassword: CYPRESS_USER_PASSWORD,
      newPassword: 'ABCabc12345',
      confirmPassword: 'ABCabc12345',
    });

    expect(body.statusCode).to.equal(400);
    expect(body.message[0]).to.equal(PASSWORD_ERROR_MESSAGE);
  });

  it('should fail on password missing numbers', async () => {
    const { body } = await session.testAgent.post('/v1/auth/update-password').send({
      currentPassword: CYPRESS_USER_PASSWORD,
      newPassword: 'ABCabc@ABCDE',
      confirmPassword: 'ABCabc@ABCDE',
    });

    expect(body.statusCode).to.equal(400);
    expect(body.message[0]).to.equal(PASSWORD_ERROR_MESSAGE);
  });

  it('should fail if password length is less than 8 or more then 64', async () => {
    const { body: minimumLengthBody } = await session.testAgent.post('/v1/auth/update-password').send({
      currentPassword: CYPRESS_USER_PASSWORD,
      newPassword: '123',
      confirmPassword: '123',
    });

    expect(minimumLengthBody.statusCode).to.equal(400);
    expect(minimumLengthBody.message[0]).to.equal(PASSWORD_ERROR_MESSAGE);

    const { body: maxLengthBody } = await session.testAgent.post('/v1/auth/update-password').send({
      currentPassword: CYPRESS_USER_PASSWORD,
      newPassword: 'Ab1@'.repeat(20),
      confirmPassword: 'Ab1@'.repeat(20),
    });

    expect(maxLengthBody.statusCode).to.equal(400);
    expect(maxLengthBody.message[0]).to.equal(PASSWORD_ERROR_MESSAGE);
  });
});
