import { Novu } from '@novu/api';
import { ContextRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { expectSdkExceptionGeneric, initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Delete Context - /contexts/:type/:id (DELETE) #novu-v2', () => {
  let session: UserSession;
  let novuClient: Novu;
  const contextRepository = new ContextRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    novuClient = initNovuClassSdk(session);
  });

  it('should delete newly created context', async () => {
    await contextRepository.create({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
      type: 'tenant',
      id: 'delete-test-org-acme',
      key: 'tenant:delete-test-org-acme',
      data: { tenantName: 'Acme Corp', region: 'us-east-1' },
    });

    const existingContext = await contextRepository.findOne({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      type: 'tenant',
      id: 'delete-test-org-acme',
    });

    expect(existingContext).to.be.ok;

    await novuClient.contexts.delete('tenant', 'delete-test-org-acme');

    const deletedContext = await contextRepository.findOne({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      type: 'tenant',
      id: 'delete-test-org-acme',
    });

    expect(deletedContext).to.equal(null);
  });

  it('should throw exception while trying to delete non-existing context', async () => {
    const type = 'tenant';
    const id = 'non-existent-context';

    const { error } = await expectSdkExceptionGeneric(() => novuClient.contexts.delete(type, id));

    expect(error).to.be.ok;
    expect(error?.statusCode).to.equal(404);
    expect(error?.message).to.contain(
      `Context with id '${id}' and type '${type}' not found in environment ${session.environment._id}`
    );
  });
});
