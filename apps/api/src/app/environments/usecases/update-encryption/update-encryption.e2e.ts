import { EnvironmentRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('Update Environment encryption - /environments/encryption (POST)', async () => {
  let session: UserSession;
  const environmentRepository = new EnvironmentRepository();

  before(async () => {
    session = new UserSession();
    await session.initialize({
      noEnvironment: true,
    });
  });

  it('should set environment encryption from false to true', async () => {
    await session.testAgent.put('/v1/environments/encrypt').send({
      encrypted: true,
    });

    const updatedEnvironment = await environmentRepository.findById(session.environment._id);

    expect(session.environment.encrypted).to.eq(false);
    expect(updatedEnvironment.encrypted).to.eq(true);
  });
});
