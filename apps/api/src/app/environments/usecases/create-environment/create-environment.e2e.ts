import { EnvironmentRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('Create Environment - /environments (POST)', async () => {
  let session: UserSession;
  const environmentRepository = new EnvironmentRepository();

  before(async () => {
    session = new UserSession();
    await session.initialize({
      noEnvironment: true,
    });
  });

  it('should create environment entity correctly', async () => {
    const demoEnvironment = {
      name: 'Hello App',
    };
    const { body } = await session.testAgent.post('/v1/environments').send(demoEnvironment).expect(201);

    expect(body.data.name).to.eq(demoEnvironment.name);
    expect(body.data._organizationId).to.eq(session.organization._id);
    expect(body.data.identifier).to.be.ok;
    const dbApp = await environmentRepository.findById(body.data._id);

    expect(dbApp.apiKeys.length).to.equal(1);
    expect(dbApp.apiKeys[0].key).to.be.ok;
    expect(dbApp.apiKeys[0]._userId).to.equal(session.user._id);
  });

  it('should fail when no name provided', async () => {
    const demoEnvironment = {};
    const { body } = await session.testAgent.post('/v1/environments').send(demoEnvironment).expect(400);

    expect(body.message[0]).to.contain('name should not be null');
  });
});
