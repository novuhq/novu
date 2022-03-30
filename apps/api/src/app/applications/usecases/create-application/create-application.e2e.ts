import { ApplicationRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('Create Application - /applications (POST)', async () => {
  let session: UserSession;
  const applicationRepository = new ApplicationRepository();

  before(async () => {
    session = new UserSession();
    await session.initialize({
      noApplication: true,
    });
  });

  it('should create application entity correctly', async () => {
    const demoApplication = {
      name: 'Hello App',
    };
    const { body } = await session.testAgent.post('/v1/applications').send(demoApplication).expect(201);

    expect(body.data.name).to.eq(demoApplication.name);
    expect(body.data._organizationId).to.eq(session.organization._id);
    expect(body.data.identifier).to.be.ok;
    const dbApp = await applicationRepository.findById(body.data._id);

    expect(dbApp.apiKeys.length).to.equal(1);
    expect(dbApp.apiKeys[0].key).to.be.ok;
    expect(dbApp.apiKeys[0]._userId).to.equal(session.user._id);
  });

  it('should fail when no name provided', async () => {
    const demoApplication = {};
    const { body } = await session.testAgent.post('/v1/applications').send(demoApplication).expect(400);

    expect(body.message[0]).to.contain('name should not be null');
  });
});
