import { Novu } from '@novu/api';
import { EnvironmentRepository, NotificationTemplateRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { expectSdkExceptionGeneric, initNovuClassSdkInternalAuth } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Get Environment Tags - /v2/environments/:environmentId/tags (GET) #novu-v2', async () => {
  let session: UserSession;
  let novuClient: Novu;
  const environmentRepository = new EnvironmentRepository();
  const notificationTemplateRepository = new NotificationTemplateRepository();

  before(async () => {
    session = new UserSession();
    await session.initialize();
    novuClient = initNovuClassSdkInternalAuth(session);
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

    const response = await novuClient.environments.getTags(session.environment._id);

    expect(response.result).to.be.an('array');
    expect(response.result).to.have.lengthOf(3);
    expect(response.result).to.deep.include({ name: 'tag1' });
    expect(response.result).to.deep.include({ name: 'tag2' });
    expect(response.result).to.deep.include({ name: 'tag3' });
  });

  it('should return an empty array when no tags exist', async () => {
    const newEnvironment = await environmentRepository.create({
      name: 'Test Environment',
      _organizationId: session.organization._id,
    });

    const response = await novuClient.environments.getTags(newEnvironment._id);

    expect(response.result).to.be.an('array');
    expect(response.result).to.have.lengthOf(0);
  });

  it('should throw NotFoundException for non-existent environment', async () => {
    const nonExistentId = '60a5f2f2f2f2f2f2f2f2f2f2';
    const { error } = await expectSdkExceptionGeneric(() => novuClient.environments.getTags(nonExistentId));

    expect(error?.statusCode).to.equal(404);
    expect(error?.message).to.equal(`Environment ${nonExistentId} not found`);
  });
});
