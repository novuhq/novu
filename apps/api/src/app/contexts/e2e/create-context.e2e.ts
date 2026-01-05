import { Novu } from '@novu/api';
import { ContextRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import {
  expectSdkExceptionGeneric,
  expectSdkValidationExceptionGeneric,
  initNovuClassSdk,
} from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Create Context - /contexts (POST) #novu-v2', () => {
  let session: UserSession;
  let novuClient: Novu;
  const contextRepository = new ContextRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    novuClient = initNovuClassSdk(session);
  });

  it('should create a new context', async () => {
    const response = await novuClient.contexts.create({
      type: 'tenant',
      id: 'create-test-org-acme',
      data: { tenantName: 'Acme Corp', region: 'us-east-1' },
    });

    expect(response.result).to.be.ok;
    expect(response.result.type).to.equal('tenant');
    expect(response.result.id).to.equal('create-test-org-acme');
    expect(response.result.data).to.deep.equal({ tenantName: 'Acme Corp', region: 'us-east-1' });

    const createdContext = await contextRepository.findOne({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
      type: 'tenant',
      id: 'create-test-org-acme',
    });

    expect(createdContext?.type).to.equal('tenant');
    expect(createdContext?.id).to.equal('create-test-org-acme');
    expect(createdContext?.data).to.deep.equal({ tenantName: 'Acme Corp', region: 'us-east-1' });
  });

  it('should create a context without data', async () => {
    const response = await novuClient.contexts.create({
      type: 'workspace',
      id: 'create-test-workspace-123',
    });

    expect(response.result).to.be.ok;
    expect(response.result.type).to.equal('workspace');
    expect(response.result.id).to.equal('create-test-workspace-123');

    const createdContext = await contextRepository.findOne({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
      type: 'workspace',
      id: 'create-test-workspace-123',
    });

    expect(createdContext?.type).to.equal('workspace');
    expect(createdContext?.id).to.equal('create-test-workspace-123');
    expect(createdContext?.data).to.deep.equal({});
  });

  it('should throw error if a context already exists', async () => {
    await novuClient.contexts.create({
      type: 'tenant',
      id: 'create-test-duplicate',
      data: { tenantName: 'Acme Corp' },
    });

    const { error } = await expectSdkExceptionGeneric(() =>
      novuClient.contexts.create({
        type: 'tenant',
        id: 'create-test-duplicate',
        data: { tenantName: 'Acme Corp Updated' },
      })
    );

    expect(error).to.be.ok;
    expect(error?.statusCode).to.equal(409);
    expect(error?.message).to.contain(`Context with type 'tenant' and id 'create-test-duplicate' already exists`);
  });

  it('should throw error if type is missing', async () => {
    const { error } = await expectSdkValidationExceptionGeneric(() =>
      novuClient.contexts.create({
        type: '',
        id: 'org-acme',
      })
    );

    expect(error).to.be.ok;
    expect(error?.statusCode).to.equal(422);
  });

  it('should throw error if id is missing', async () => {
    const { error } = await expectSdkValidationExceptionGeneric(() =>
      novuClient.contexts.create({
        type: 'tenant',
        id: '',
      })
    );

    expect(error).to.be.ok;
    expect(error?.statusCode).to.equal(422);
  });

  it('should throw error if type has invalid format', async () => {
    const { error } = await expectSdkValidationExceptionGeneric(() =>
      novuClient.contexts.create({
        type: 'Invalid_Type!',
        id: 'create-test-invalid-type',
      })
    );

    expect(error).to.be.ok;
    expect(error?.statusCode).to.equal(422);
  });

  it('should throw error if id has invalid format', async () => {
    const { error } = await expectSdkValidationExceptionGeneric(() =>
      novuClient.contexts.create({
        type: 'tenant',
        id: 'Invalid ID!',
      })
    );

    expect(error).to.be.ok;
    expect(error?.statusCode).to.equal(422);
  });
});
