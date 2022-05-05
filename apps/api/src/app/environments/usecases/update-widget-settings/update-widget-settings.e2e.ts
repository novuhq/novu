import { EnvironmentRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('Update Environment encryption - /environments/widget/settings (POST)', async () => {
  let session: UserSession;
  const environmentRepository = new EnvironmentRepository();

  before(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should set environment encryption from false to true', async () => {
    await session.testAgent.put('/v1/environments/widget/settings').send({ notificationCenterEncryption: true });

    const updatedEnvironment = await environmentRepository.findById(session.environment._id);

    expect(session.environment.widget.notificationCenterEncryption).to.eq(false);
    expect(updatedEnvironment.widget.notificationCenterEncryption).to.eq(true);
  });
});
