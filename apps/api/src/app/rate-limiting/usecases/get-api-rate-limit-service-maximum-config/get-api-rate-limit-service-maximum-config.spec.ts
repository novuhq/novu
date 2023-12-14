import { Test, TestingModule } from '@nestjs/testing';
import { GetApiRateLimitServiceMaximumConfig } from './get-api-rate-limit-service-maximum-config.usecase';
import {
  ApiRateLimitCategoryEnum,
  ApiRateLimitServiceMaximumEnvVarFormat,
  ApiServiceLevelEnum,
  DEFAULT_API_RATE_LIMIT_SERVICE_MAXIMUM_CONFIG,
} from '@novu/shared';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { CacheService, InvalidateCacheService, cacheService as cacheServiceProvider } from '@novu/application-generic';

const mockRateLimitServiceLevel = ApiServiceLevelEnum.FREE;
const mockRateLimitCategory = ApiRateLimitCategoryEnum.GLOBAL;
const mockEnvVarName: ApiRateLimitServiceMaximumEnvVarFormat = `API_RATE_LIMIT_MAXIMUM_${
  mockRateLimitServiceLevel.toUpperCase() as Uppercase<ApiServiceLevelEnum>
}_${mockRateLimitCategory.toUpperCase() as Uppercase<ApiRateLimitCategoryEnum>}`;
const mockOverrideRateLimit = 65;

describe('GetApiRateLimitServiceMaximumConfig', () => {
  let useCase: GetApiRateLimitServiceMaximumConfig;
  let invalidateCacheService: InvalidateCacheService;
  let cacheService: CacheService;

  let invalidateByKeyStub: sinon.SinonStub;
  let cacheServiceIsEnabledStub: sinon.SinonStub;
  let moduleRef: TestingModule;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [cacheServiceProvider, InvalidateCacheService, GetApiRateLimitServiceMaximumConfig],
    }).compile();

    useCase = moduleRef.get(GetApiRateLimitServiceMaximumConfig);
    invalidateCacheService = moduleRef.get(InvalidateCacheService);
    cacheService = moduleRef.get<CacheService>(CacheService);

    invalidateByKeyStub = sinon.stub(invalidateCacheService, 'invalidateByKey').resolves();
    cacheServiceIsEnabledStub = sinon.stub(cacheService, 'cacheEnabled').returns(true);

    await moduleRef.init();
  });

  afterEach(() => {
    invalidateByKeyStub.reset();
  });

  it('should load the default API rate limits on module init', () => {
    expect(useCase.default).to.deep.equal(DEFAULT_API_RATE_LIMIT_SERVICE_MAXIMUM_CONFIG);
  });

  it('should override default API rate limits with environment variables', async () => {
    process.env[mockEnvVarName] = `${mockOverrideRateLimit}`;
    // Re-initialize the defaults after setting the environment variable
    await useCase.loadDefault();
    delete process.env[mockEnvVarName]; // cleanup

    expect(useCase.default[mockRateLimitServiceLevel][mockRateLimitCategory]).to.equal(mockOverrideRateLimit);
  });

  it('should NOT invalidate the cache when loading defaults and the cache IS disabled', async () => {
    cacheServiceIsEnabledStub.returns(false);
    await useCase.loadDefault();

    expect(invalidateByKeyStub.callCount).to.equal(0);
  });

  it('should NOT invalidate the cache when loading defaults and the config HAS NOT changed between loads', async () => {
    cacheServiceIsEnabledStub.returns(true);
    await useCase.loadDefault();
    await useCase.loadDefault();

    expect(invalidateByKeyStub.callCount).to.equal(0);
  });

  it('should invalidate the cache when loading defaults and the config HAS changed between loads', async () => {
    cacheServiceIsEnabledStub.returns(true);
    await useCase.loadDefault();

    process.env[mockEnvVarName] = `${mockOverrideRateLimit + 1}`;
    // Re-initialize the defaults after setting the environment variable
    await useCase.loadDefault();
    delete process.env[mockEnvVarName]; // cleanup

    expect(invalidateByKeyStub.callCount).to.equal(1);
  });
});
