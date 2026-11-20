import { encryptApiKey, InMemoryLRUCacheStore } from '@novu/application-generic';
import { expect } from 'chai';
import { createHash } from 'crypto';
import sinon from 'sinon';
import { getBridgeSecretKeysCacheKey } from '../../bridge-secret-keys-cache';
import { GetApiKeysCommand } from '../get-api-keys/get-api-keys.command';
import { GetApiKeys } from '../get-api-keys/get-api-keys.usecase';
import { RegenerateApiKeys } from './regenerate-api-keys.usecase';

describe('RegenerateApiKeys', () => {
  const environmentId = 'env_1';
  const legacyKey = 'legacy_secret_without_stored_hash';

  function setup({ environment }: { environment: { apiKeys: unknown[] } | null }) {
    const environmentRepository = {
      findOne: sinon.stub().resolves(environment),
      getApiKeys: sinon.stub().resolves(environment?.apiKeys ?? []),
      updateApiKey: sinon.stub().resolves([{ _userId: 'user_1', key: encryptApiKey('new_secret'), hash: 'new_hash' }]),
    };
    const generateUniqueApiKey = { execute: sinon.stub().resolves('new_secret') };
    const inMemoryLRUCacheService = { invalidate: sinon.stub() };
    const apiKeyRevocationService = {
      getPolicy: sinon.stub().resolves({ mode: 'off' }),
      isRotationRequired: sinon.stub().returns(false),
    };

    const useCase = new RegenerateApiKeys(
      environmentRepository as never,
      generateUniqueApiKey as never,
      new GetApiKeys(environmentRepository as never, apiKeyRevocationService as never),
      inMemoryLRUCacheService as never
    );

    return { useCase, inMemoryLRUCacheService };
  }

  function command() {
    return GetApiKeysCommand.create({
      environmentId,
      organizationId: 'org_1',
      userId: 'user_1',
    } as never);
  }

  it('invalidates the auth cache for every replaced key and the bridge secret keys cache', async () => {
    const { useCase, inMemoryLRUCacheService } = setup({
      environment: {
        apiKeys: [{ key: encryptApiKey('old_secret'), hash: 'old_hash' }, { key: encryptApiKey(legacyKey) }],
      },
    });

    await useCase.execute(command());

    const legacyHash = createHash('sha256').update(legacyKey).digest('hex');

    expect(inMemoryLRUCacheService.invalidate.calledWith(InMemoryLRUCacheStore.API_KEY_USER, 'old_hash')).to.equal(
      true
    );
    expect(inMemoryLRUCacheService.invalidate.calledWith(InMemoryLRUCacheStore.API_KEY_USER, legacyHash)).to.equal(
      true
    );
    expect(
      inMemoryLRUCacheService.invalidate.calledWith(
        InMemoryLRUCacheStore.VALIDATOR,
        getBridgeSecretKeysCacheKey(environmentId)
      )
    ).to.equal(true);
  });

  it('does not invalidate anything when the environment is missing', async () => {
    const { useCase, inMemoryLRUCacheService } = setup({ environment: null });

    let thrown: unknown;
    try {
      await useCase.execute(command());
    } catch (error) {
      thrown = error;
    }

    expect(thrown).to.be.instanceOf(Error);
    expect(inMemoryLRUCacheService.invalidate.called).to.equal(false);
  });
});
