import { EnvironmentRepository, OrganizationRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import * as jwt from 'jsonwebtoken';
import { expect } from 'chai';
import { IJwtPayload, MemberRoleEnum } from '@novu/shared';

describe('User registration - /auth/register (POST)', async () => {
  let session: UserSession;
  const environmentRepository = new EnvironmentRepository();
  const organizationRepository = new OrganizationRepository();

  before(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should throw validation error for not enough information', async () => {
    const { body } = await session.testAgent.post('/v1/auth/register').send({
      email: '123',
    });

    expect(body.statusCode).to.equal(400);
    expect(body.message.find((i) => i.includes('email'))).to.be.ok;
    expect(body.message.find((i) => i.includes('password'))).to.be.ok;
    expect(body.message.find((i) => i.includes('firstName'))).to.be.ok;
  });

  it('should throw error if user signup is disabled', async () => {
    process.env.DISABLE_USER_REGISTRATION = 'true';

    const { body } = await session.testAgent.post('/v1/auth/register').send({
      email: 'Testy.test@gmail.com',
      firstName: 'Test',
      lastName: 'User',
      password: '123@Qwerty',
    });

    expect(body.statusCode).to.equal(400);
    expect(JSON.stringify(body)).to.include('Account creation is disabled');

    process.env.DISABLE_USER_REGISTRATION = 'false';
  });

  it('should create a new user successfully', async () => {
    const { body } = await session.testAgent.post('/v1/auth/register').send({
      email: 'Testy.test@gmail.com',
      firstName: 'Test',
      lastName: 'User',
      password: '123@Qwerty',
    });

    expect(body.data.token).to.be.ok;

    const jwtContent = (await jwt.decode(body.data.token)) as IJwtPayload;

    expect(jwtContent.firstName).to.equal('test');
    expect(jwtContent.lastName).to.equal('user');
    expect(jwtContent.email).to.equal('testytest@gmail.com');
  });

  it('should create a user with organization', async () => {
    const { body } = await session.testAgent.post('/v1/auth/register').send({
      email: 'Testy.test-org@gmail.com',
      firstName: 'Test',
      lastName: 'User',
      password: '123@Qwerty',
      organizationName: 'Sample org',
    });

    expect(body.data.token).to.be.ok;

    const jwtContent = (await jwt.decode(body.data.token)) as IJwtPayload;

    expect(jwtContent.firstName).to.equal('test');
    expect(jwtContent.lastName).to.equal('user');

    // Should generate organization
    expect(jwtContent.organizationId).to.be.ok;
    const organization = await organizationRepository.findById(jwtContent.organizationId);

    expect(organization.name).to.equal('Sample org');

    // Should generate environment and api keys
    expect(jwtContent.environmentId).to.be.ok;
    const environment = await environmentRepository.findOne({ _id: jwtContent.environmentId });

    expect(environment.apiKeys.length).to.equal(1);
    expect(environment.apiKeys[0].key).to.ok;

    expect(jwtContent.roles[0]).to.equal(MemberRoleEnum.ADMIN);
  });

  it("should throw error when the password doesn't meets the requirements", async () => {
    const { body } = await session.testAgent.post('/v1/auth/register').send({
      email: 'Testy.test12345@gmail.com',
      firstName: 'Test',
      lastName: 'User',
      password: 'password',
    });

    expect(body.message[0]).to.contain(
      // eslint-disable-next-line max-len
      'The password must contain minimum 8 and maximum 64 characters, at least one uppercase letter, one lowercase letter, one number and one special character #?!@$%^&*()-'
    );
  });
});
