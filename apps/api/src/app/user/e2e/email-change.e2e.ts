import { EnvironmentRepository, OrganizationRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('Change Profile Email - /users/profile/email (PUT)', async () => {
  let session: UserSession;
  let existingSession: UserSession;
  const environmentRepository = new EnvironmentRepository();
  const organizationRepository = new OrganizationRepository();

  before(async () => {
    session = new UserSession();
    await session.initialize();

    existingSession = new UserSession();
    await existingSession.initialize();
  });

  it('should throw when existing email provided', async () => {
    const { body } = await session.testAgent.put('/v1/users/profile/email').send({
      email: existingSession.user.email,
    });

    expect(body.statusCode).to.equal(400);
    expect(body.message).to.equal('E-mail is invalid or taken');
  });

  it('should update the e-mail address', async () => {
    const { body } = await session.testAgent.put('/v1/users/profile/email').send({
      email: 'another-email@gmail.com',
    });

    expect(body.data.email).to.equal('another-email@gmail.com');
  });

  it('should normalize the updated the e-mail address', async () => {
    const { body } = await session.testAgent.put('/v1/users/profile/email').send({
      email: 'another-email-12+123@gmail.com',
    });

    expect(body.data.email).to.equal('another-email-12@gmail.com');
  });
});
