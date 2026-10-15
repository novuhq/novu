import { UnauthorizedException } from '@nestjs/common';
import { CacheService, FeatureFlagsService, InMemoryLRUCacheService } from '@novu/application-generic';
import { ApiAuthSchemeEnum, UserSessionData } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';

import { hashApiKey } from '../../../keyless/keyless-agent-environment';
import { AuthService } from '../auth.service';
import { ApiKeyStrategy } from './apikey.strategy';

const SECRET_KEY = 'sk_claimed_key';
const MANAGED_ENV_KEYS = [
  'NOVU_ENTERPRISE',
  'CI_EE_TEST',
  'IS_SELF_HOSTED',
  'KEYLESS_ORGANIZATION_ID',
  'KEYLESS_USER_EMAIL',
];

describe('ApiKeyStrategy', () => {
  const originalEnv: Record<string, string | undefined> = {};
  let authService: sinon.SinonStubbedInstance<AuthService>;
  let featureFlagsService: sinon.SinonStubbedInstance<FeatureFlagsService>;
  let inMemoryLRUCacheService: sinon.SinonStubbedInstance<InMemoryLRUCacheService>;
  let cacheService: sinon.SinonStubbedInstance<CacheService>;
  let strategy: ApiKeyStrategy;

  beforeEach(() => {
    for (const key of MANAGED_ENV_KEYS) {
      originalEnv[key] = process.env[key];
    }
    process.env.NOVU_ENTERPRISE = 'true';
    delete process.env.IS_SELF_HOSTED;
    process.env.KEYLESS_ORGANIZATION_ID = 'keyless-org-id';
    process.env.KEYLESS_USER_EMAIL = 'keyless@example.com';

    authService = sinon.createStubInstance(AuthService);
    featureFlagsService = sinon.createStubInstance(FeatureFlagsService);
    featureFlagsService.getFlag.resolves(false as never);
    inMemoryLRUCacheService = sinon.createStubInstance(InMemoryLRUCacheService);
    inMemoryLRUCacheService.get.callsFake((_store, _key, fetchFn) => fetchFn());
    cacheService = sinon.createStubInstance(CacheService);
    cacheService.cacheEnabled.returns(true);

    strategy = new ApiKeyStrategy(authService, featureFlagsService, inMemoryLRUCacheService, cacheService);
  });

  afterEach(() => {
    for (const key of MANAGED_ENV_KEYS) {
      if (originalEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalEnv[key];
      }
    }
    sinon.restore();
  });

  function tombstone() {
    return JSON.stringify({
      environmentId: 'env-1',
      organizationId: 'keyless-org-id',
      claimedAt: '2026-10-14T00:00:00Z',
    });
  }

  it('returns the user for a known key without reading tombstones', async () => {
    const user = { _id: 'user-1', organizationId: 'org-1', environmentId: 'env-1', scheme: ApiAuthSchemeEnum.API_KEY };
    authService.getUserByApiKey.resolves(user as UserSessionData);

    expect(await strategy.validate(SECRET_KEY)).to.equal(user);
    expect(cacheService.get.called).to.equal(false);
  });

  it('throws keyless_environment_claimed for an unknown key with a claimed tombstone', async () => {
    authService.getUserByApiKey.rejects(new UnauthorizedException('API Key not found'));
    cacheService.get.resolves(tombstone());

    try {
      await strategy.validate(SECRET_KEY);
      expect.fail('Expected UnauthorizedException');
    } catch (error) {
      expect(error).to.be.instanceOf(UnauthorizedException);
      expect((error as UnauthorizedException).getResponse()).to.include({
        statusCode: 401,
        code: 'keyless_environment_claimed',
      });
    }

    expect(cacheService.get.firstCall.args[0]).to.equal(`keyless_agent_claimed_key:{${hashApiKey(SECRET_KEY)}}`);
  });

  it('keeps the original error for an unknown key without a tombstone', async () => {
    const original = new UnauthorizedException('API Key not found');
    authService.getUserByApiKey.rejects(original);
    cacheService.get.resolves(null);

    try {
      await strategy.validate(SECRET_KEY);
      expect.fail('Expected UnauthorizedException');
    } catch (error) {
      expect(error).to.equal(original);
    }
  });

  it('returns false when the user lookup comes back empty and no tombstone exists', async () => {
    authService.getUserByApiKey.resolves(null as unknown as UserSessionData);
    cacheService.get.resolves(null);

    expect(await strategy.validate(SECRET_KEY)).to.equal(false);
  });

  it('keeps the original error when the tombstone read fails', async () => {
    const original = new UnauthorizedException('API Key not found');
    authService.getUserByApiKey.rejects(original);
    cacheService.get.rejects(new Error('redis down'));

    try {
      await strategy.validate(SECRET_KEY);
      expect.fail('Expected UnauthorizedException');
    } catch (error) {
      expect(error).to.equal(original);
    }
  });

  it('does not read tombstones when keyless agent environments are not supported', async () => {
    process.env.IS_SELF_HOSTED = 'true';
    const original = new UnauthorizedException('API Key not found');
    authService.getUserByApiKey.rejects(original);
    cacheService.get.resolves(tombstone());

    try {
      await strategy.validate(SECRET_KEY);
      expect.fail('Expected UnauthorizedException');
    } catch (error) {
      expect(error).to.equal(original);
    }

    expect(cacheService.get.called).to.equal(false);
  });

  it('does not swallow non-auth errors such as the kill switch', async () => {
    authService.getUserByApiKey.rejects(new Error('mongo down'));

    try {
      await strategy.validate(SECRET_KEY);
      expect.fail('Expected error');
    } catch (error) {
      expect((error as Error).message).to.equal('mongo down');
    }

    expect(cacheService.get.called).to.equal(false);
  });
});
