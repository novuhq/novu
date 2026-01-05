import { Novu } from '@novu/api';
import { ContextRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import {
  expectSdkExceptionGeneric,
  expectSdkZodError,
  initNovuClassSdk,
} from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Update Context - /contexts/:type/:id (PATCH) #novu-v2', () => {
  let session: UserSession;
  let novuClient: Novu;
  const contextRepository = new ContextRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    novuClient = initNovuClassSdk(session);
  });

  afterEach(async () => {
    await contextRepository.delete({
      _environmentId: session.environment._id,
    });
  });

  it('should update context data', async () => {
    await contextRepository.create({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
      type: 'tenant',
      id: 'update-test-org-1',
      key: 'tenant:update-test-org-1',
      data: { tenantName: 'Acme Corp', region: 'us-east-1' },
    });

    const response = await novuClient.contexts.update({
      type: 'tenant',
      id: 'update-test-org-1',
      updateContextRequestDto: {
        data: { tenantName: 'Acme Corporation', region: 'us-west-2', settings: { theme: 'dark' } },
      },
    });

    expect(response.result).to.be.ok;

    const updatedContext = await contextRepository.findOne({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      type: 'tenant',
      id: 'update-test-org-1',
    });

    expect(updatedContext?.data).to.deep.equal({
      tenantName: 'Acme Corporation',
      region: 'us-west-2',
      settings: { theme: 'dark' },
    });
  });

  it('should replace context data completely', async () => {
    await contextRepository.create({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
      type: 'tenant',
      id: 'update-test-org-2',
      key: 'tenant:update-test-org-2',
      data: { tenantName: 'Acme Corp', region: 'us-east-1', oldField: 'value' },
    });

    const response = await novuClient.contexts.update({
      type: 'tenant',
      id: 'update-test-org-2',
      updateContextRequestDto: {
        data: { newField: 'newValue' },
      },
    });

    expect(response.result).to.be.ok;

    const updatedContext = await contextRepository.findOne({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      type: 'tenant',
      id: 'update-test-org-2',
    });

    expect(updatedContext?.data).to.deep.equal({ newField: 'newValue' });
    expect(updatedContext?.data).to.not.have.property('oldField');
  });

  it('should update context data to empty object', async () => {
    await contextRepository.create({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
      type: 'tenant',
      id: 'update-test-org-3',
      key: 'tenant:update-test-org-3',
      data: { tenantName: 'Acme Corp', region: 'us-east-1' },
    });

    const response = await novuClient.contexts.update({
      type: 'tenant',
      id: 'update-test-org-3',
      updateContextRequestDto: {
        data: {},
      },
    });

    expect(response.result).to.be.ok;

    const updatedContext = await contextRepository.findOne({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      type: 'tenant',
      id: 'update-test-org-3',
    });

    expect(updatedContext?.data).to.deep.equal({});
  });

  it('should throw exception if context does not exist', async () => {
    const { error } = await expectSdkExceptionGeneric(() =>
      novuClient.contexts.update({
        type: 'tenant',
        id: 'non-existent',
        updateContextRequestDto: {
          data: { test: 'value' },
        },
      })
    );

    expect(error).to.be.ok;
    expect(error?.statusCode).to.equal(404);
    expect(error?.message).to.contain(`Context with type 'tenant' and id 'non-existent' not found`);
  });

  it('should throw error if data is missing', async () => {
    await contextRepository.create({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
      type: 'tenant',
      id: 'update-test-org-4',
      key: 'tenant:update-test-org-4',
      data: { tenantName: 'Acme Corp' },
    });

    const { error } = await expectSdkZodError(() =>
      novuClient.contexts.update({
        type: 'tenant',
        id: 'update-test-org-4',
        updateContextRequestDto: {} as any,
      })
    );

    expect(error).to.be.ok;
    expect(error?.name).to.equal('SDKValidationError');
  });
});
