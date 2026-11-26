import { InMemoryLRUCacheStore } from '@novu/application-generic';
import { expect } from 'chai';
import sinon from 'sinon';
import { getBridgeSecretKeysCacheKey } from '../../bridge-secret-keys-cache';
import { DeleteApiKeyCommand } from './delete-api-key.command';
import { DeleteApiKey } from './delete-api-key.usecase';

describe('DeleteApiKey', () => {
  const environmentId = 'env_1';
  const keepHash = 'keep_hash';
  const deleteHash = 'delete_hash';

  function setup({
    apiKeys = [{ hash: keepHash }, { hash: deleteHash }],
    deleteResult = { matched: 1, modified: 1 },
  } = {}) {
    const environmentRepository = {
      getApiKeys: sinon.stub().resolves(apiKeys),
      deleteApiKey: sinon.stub().resolves(deleteResult),
    };
    const featureFlagsService = { getFlag: sinon.stub().resolves(true) };
    const inMemoryLRUCacheService = { invalidate: sinon.stub() };

    const useCase = new DeleteApiKey(
      environmentRepository as never,
      featureFlagsService as never,
      inMemoryLRUCacheService as never
    );

    return { useCase, inMemoryLRUCacheService, environmentRepository };
  }

  function command(hash: string) {
    return DeleteApiKeyCommand.create({
      environmentId,
      hash,
      organizationId: 'org_1',
      userId: 'user_1',
    } as never);
  }

  it('invalidates the bridge secret keys cache for the environment after deleting a key', async () => {
    const { useCase, inMemoryLRUCacheService } = setup();

    await useCase.execute(command(deleteHash));

    expect(
      inMemoryLRUCacheService.invalidate.calledWith(
        InMemoryLRUCacheStore.VALIDATOR,
        getBridgeSecretKeysCacheKey(environmentId)
      )
    ).to.equal(true);
  });

  it('does not invalidate the bridge secret keys cache when the key is not found', async () => {
    const { useCase, inMemoryLRUCacheService } = setup();

    let thrown: unknown;
    try {
      await useCase.execute(command('unknown_hash'));
    } catch (error) {
      thrown = error;
    }

    expect(thrown).to.be.instanceOf(Error);
    expect(inMemoryLRUCacheService.invalidate.calledWith(InMemoryLRUCacheStore.VALIDATOR)).to.equal(false);
  });
});
