import { ApiServiceLevelEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('Delete Environment API key environment scope - DELETE /environments/:environmentId #novu-v2', () => {
  let session: UserSession;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    await session.updateOrganizationServiceLevel(ApiServiceLevelEnum.BUSINESS);
  });

  it('should forbid deleting a sibling environment via API key', async () => {
    const {
      body: { data: createdEnv },
    } = await session.testAgent.post('/v1/environments').send({
      name: 'Sibling Env To Delete',
      color: '#ff0000',
    });

    expect(createdEnv._id, 'Expected custom environment to be created').to.exist;

    const { body } = await session.testAgent
      .delete(`/v1/environments/${createdEnv._id}`)
      .set('authorization', `ApiKey ${session.apiKey}`);

    expect(body.statusCode).to.equal(403);
    expect(body.message).to.contain('is scoped to a single environment');
  });

  it('should allow bearer auth to delete a sibling environment in the same org', async () => {
    const {
      body: { data: createdEnv },
    } = await session.testAgent.post('/v1/environments').send({
      name: 'Bearer Deletable Env',
      color: '#00ff00',
    });

    expect(createdEnv._id, 'Expected custom environment to be created').to.exist;

    const { status } = await session.testAgent.delete(`/v1/environments/${createdEnv._id}`);

    expect(status).to.equal(200);
  });
});
