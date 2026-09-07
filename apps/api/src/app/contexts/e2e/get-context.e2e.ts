import { Novu } from '@novu/api';
import { ContextRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { expectSdkExceptionGeneric, initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Get Context - /contexts/:type/:id (GET) #novu-v2', () => {
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

  it('should get a newly created context', async () => {
    await contextRepository.create({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
      type: 'tenant',
      id: 'get-test-org-acme',
      key: 'tenant:get-test-org-acme',
      data: { tenantName: 'Acme Corp', region: 'us-east-1' },
    });

    const response = await novuClient.contexts.retrieve('tenant', 'get-test-org-acme');

    expect(response.result.type).to.equal('tenant');
    expect(response.result.id).to.equal('get-test-org-acme');
    expect(response.result.data).to.deep.equal({ tenantName: 'Acme Corp', region: 'us-east-1' });
    expect(response.result.createdAt).to.be.ok;
    expect(response.result.updatedAt).to.be.ok;
  });

  it('should get a context with empty data', async () => {
    await contextRepository.create({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
      type: 'workspace',
      id: 'get-test-workspace-123',
      key: 'workspace:get-test-workspace-123',
      data: {},
    });

    const response = await novuClient.contexts.retrieve('workspace', 'get-test-workspace-123');

    expect(response.result.type).to.equal('workspace');
    expect(response.result.id).to.equal('get-test-workspace-123');
    expect(response.result.data).to.deep.equal({});
  });

  it('should throw exception if context does not exist', async () => {
    const incorrectType = 'tenant';
    const incorrectId = 'non-existent';

    const { error } = await expectSdkExceptionGeneric(() => novuClient.contexts.retrieve(incorrectType, incorrectId));

    expect(error).to.be.ok;
    expect(error?.statusCode).to.equal(404);
    expect(error?.message).to.contain(
      `Context with id '${incorrectId}' and type '${incorrectType}' not found in environment ${session.environment._id}`
    );
  });
});
