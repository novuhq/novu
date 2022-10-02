import { EnvironmentEntity, EnvironmentRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('Delete Environment - /environments (DELETE)', async () => {
  let session: UserSession;
  let createdEnv: EnvironmentEntity;
  const environmentRepository = new EnvironmentRepository();
  const demoEnvironment = {
    name: 'Hello App',
  };

  before(async () => {
    session = new UserSession();
    await session.initialize({
      noEnvironment: true,
    });

    createdEnv = await environmentRepository.create(demoEnvironment);
  });

  it('should delete environment entity correctly', async () => {
    const { body } = await session.testAgent.delete(`/v1/environments/${createdEnv._id}`).expect(200);

    expect(body.data.name).to.eq(demoEnvironment.name);
    expect(body.data._organizationId).to.eq(session.organization._id);
    expect(body.data.identifier).to.be.ok;
  });
});
