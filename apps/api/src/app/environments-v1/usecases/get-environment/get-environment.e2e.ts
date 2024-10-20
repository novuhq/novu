import { EnvironmentRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('Get Environment - /environments/me (GET)', async () => {
  let session: UserSession;

  before(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should return correct environment to user', async () => {
    const { body } = await session.testAgent.get('/v1/environments/me');

    expect(body.data.name).to.eq(session.environment.name);
    expect(body.data._organizationId).to.eq(session.organization._id);
    expect(body.data.identifier).to.equal(session.environment.identifier);
  });
});
