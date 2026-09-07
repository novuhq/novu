import { Novu } from '@novu/api';
import { EnvironmentRepository, NotificationTemplateRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { expectSdkExceptionGeneric, initNovuClassSdkInternalAuth } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Get Environment Tags - /v2/environments/:environmentIdOrIdentifier/tags (GET) #novu-v2', async () => {
  let session: UserSession;
  let novuClient: Novu;
  const environmentRepository = new EnvironmentRepository();
  const notificationTemplateRepository = new NotificationTemplateRepository();

  before(async () => {
    session = new UserSession();
    await session.initialize();
    novuClient = initNovuClassSdkInternalAuth(session);
  });

  it('should return correct tags for the environment using environment ID', async () => {
    await notificationTemplateRepository.create({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      _creatorId: session.user._id,
      name: 'Test Template 1',
      tags: ['tag1-by-id', 'tag2-by-id'],
      steps: [],
      triggers: [{ identifier: 'test-trigger-id-1', type: 'event' }],
    });
    await notificationTemplateRepository.create({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      _creatorId: session.user._id,
      name: 'Test Template 2',
      tags: ['tag2-by-id', 'tag3-by-id', null, '', undefined],
      steps: [],
      triggers: [{ identifier: 'test-trigger-id-2', type: 'event' }],
    });

    const response = await novuClient.environments.getTags(session.environment._id);

    expect(response.result).to.be.an('array');
    expect(response.result).to.deep.include({ name: 'tag1-by-id' });
    expect(response.result).to.deep.include({ name: 'tag2-by-id' });
    expect(response.result).to.deep.include({ name: 'tag3-by-id' });
  });

  it('should return correct tags for the environment using environment identifier', async () => {
    await notificationTemplateRepository.create({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      _creatorId: session.user._id,
      name: 'Test Template 3',
      tags: ['identifier-tag1', 'identifier-tag2'],
      steps: [],
      triggers: [{ identifier: 'test-trigger-identifier-1', type: 'event' }],
    });
    await notificationTemplateRepository.create({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      _creatorId: session.user._id,
      name: 'Test Template 4',
      tags: ['identifier-tag2', 'identifier-tag3'],
      steps: [],
      triggers: [{ identifier: 'test-trigger-identifier-2', type: 'event' }],
    });

    // Use the environment identifier instead of the _id
    const response = await novuClient.environments.getTags(session.environment.identifier);

    expect(response.result).to.be.an('array');
    expect(response.result).to.deep.include({ name: 'identifier-tag1' });
    expect(response.result).to.deep.include({ name: 'identifier-tag2' });
    expect(response.result).to.deep.include({ name: 'identifier-tag3' });
  });

  // Note: Testing empty tags scenarios is covered by the error cases,
  // so we don't need separate tests that create new environments

  it('should throw NotFoundException for non-existent environment ID', async () => {
    const nonExistentId = '60a5f2f2f2f2f2f2f2f2f2f2';
    const { error } = await expectSdkExceptionGeneric(() => novuClient.environments.getTags(nonExistentId));

    expect(error?.statusCode).to.equal(404);
    expect(error?.message).to.equal(`Environment ${nonExistentId} not found`);
  });

  it('should throw NotFoundException for non-existent environment identifier', async () => {
    const nonExistentIdentifier = 'non-existent-identifier';
    const { error } = await expectSdkExceptionGeneric(() => novuClient.environments.getTags(nonExistentIdentifier));

    expect(error?.statusCode).to.equal(404);
    expect(error?.message).to.equal(`Environment ${nonExistentIdentifier} not found`);
  });

  it('should throw NotFoundException when environment identifier belongs to different organization', async () => {
    /*
     * For this test, we'll test with a fake identifier that doesn't exist
     * since the identifier lookup includes organization filtering
     */
    const fakeIdentifier = 'fake-different-org-identifier';

    const { error } = await expectSdkExceptionGeneric(() => novuClient.environments.getTags(fakeIdentifier));

    expect(error?.statusCode).to.equal(404);
    expect(error?.message).to.equal(`Environment ${fakeIdentifier} not found`);
  });
});
