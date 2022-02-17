import { ApplicationRepository, OrganizationRepository } from '@notifire/dal';
import { UserSession } from '@notifire/testing';
import * as jwt from 'jsonwebtoken';
import { expect } from 'chai';
import { IJwtPayload, MemberRoleEnum } from '@notifire/shared';

describe('User registration - /auth/register (POST)', async () => {
  let session: UserSession;
  const applicationRepository = new ApplicationRepository();
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
    expect(body.message.find((i) => i.includes('lastName'))).to.be.ok;
  });

  it('should create a new user successfully', async () => {
    const { body } = await session.testAgent.post('/v1/auth/register').send({
      email: 'Testy.test@gmail.com',
      firstName: 'Test',
      lastName: 'User',
      password: '123456789',
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
      password: '123456789',
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

    // Should generate application and api keys
    expect(jwtContent.applicationId).to.be.ok;
    const application = await applicationRepository.findById(jwtContent.applicationId);

    expect(application.apiKeys.length).to.equal(1);
    expect(application.apiKeys[0].key).to.ok;

    expect(jwtContent.roles[0]).to.equal(MemberRoleEnum.ADMIN);
  });

  it('should throw error when registering same user twice', async () => {
    const { body } = await session.testAgent.post('/v1/auth/register').send({
      email: 'Testy.test@gmail.com',
      firstName: 'Test',
      lastName: 'User',
      password: '123456789',
    });

    expect(body.message).to.contain('User already exists');
  });
});
