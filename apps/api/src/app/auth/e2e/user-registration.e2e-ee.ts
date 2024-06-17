import { EnvironmentRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import * as jwt from 'jsonwebtoken';
import { expect } from 'chai';
import { UserSessionData } from '@novu/shared';

describe('User registration in enterprise - /auth/register (POST)', async () => {
  let session: UserSession;
  const environmentRepository = new EnvironmentRepository();

  before(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('registered user should have the bridge url set on their environment', async () => {
    const { body } = await session.testAgent.post('/v1/auth/register').send({
      email: 'Testy.test-org@gmail.com',
      firstName: 'Test',
      lastName: 'User',
      password: '123@Qwerty',
      organizationName: 'Sample org',
    });

    expect(body.data.token).to.be.ok;

    const jwtContent = (await jwt.decode(body.data.token)) as UserSessionData;

    expect(jwtContent.environmentId).to.be.ok;
    const environment = await environmentRepository.findOne({ _id: jwtContent.environmentId });

    expect(environment?.echo.url).to.be.ok;
  });
});
