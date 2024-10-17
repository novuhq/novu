import { EnvironmentRepository, NotificationTemplateRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('Get Environment Tags - /v2/environments/:environmentId/tags (GET)', async () => {
  let session: UserSession;
  const environmentRepository = new EnvironmentRepository();
  const notificationTemplateRepository = new NotificationTemplateRepository();

  before(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should return correct tags for the environment', async () => {
    await notificationTemplateRepository.create({
      _environmentId: session.environment._id,
      tags: ['tag1', 'tag2'],
    });
    await notificationTemplateRepository.create({
      _environmentId: session.environment._id,
      tags: ['tag2', 'tag3', null, '', undefined],
    });

    const { body } = await session.testAgent.get(`/v2/environments/${session.environment._id}/tags`);

    expect(body.data).to.be.an('array');
    expect(body.data).to.have.lengthOf(3);
    expect(body.data).to.deep.include({ name: 'tag1' });
    expect(body.data).to.deep.include({ name: 'tag2' });
    expect(body.data).to.deep.include({ name: 'tag3' });
  });

  it('should return an empty array when no tags exist', async () => {
    const newEnvironment = await environmentRepository.create({
      name: 'Test Environment',
      _organizationId: session.organization._id,
    });

    const { body } = await session.testAgent.get(`/v2/environments/${newEnvironment._id}/tags`);

    expect(body.data).to.be.an('array');
    expect(body.data).to.have.lengthOf(0);
  });

  it('should throw NotFoundException for non-existent environment', async () => {
    const nonExistentId = '60a5f2f2f2f2f2f2f2f2f2f2';
    const { body } = await session.testAgent.get(`/v2/environments/${nonExistentId}/tags`);

    expect(body.statusCode).to.equal(404);
    expect(body.message).to.equal(`Environment ${nonExistentId} not found`);
  });
});
