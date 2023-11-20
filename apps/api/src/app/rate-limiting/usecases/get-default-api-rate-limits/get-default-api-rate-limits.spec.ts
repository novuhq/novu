import { Test } from '@nestjs/testing';
import { GetDefaultApiRateLimits } from './get-default-api-rate-limits.usecase';
import {
  ApiRateLimitCategoryTypeEnum,
  ApiRateLimitEnvVarFormat,
  ApiServiceLevelTypeEnum,
  DEFAULT_API_RATE_LIMITS,
} from '@novu/shared';
import { expect } from 'chai';

describe('GetDefaultApiRateLimits', () => {
  let useCase: GetDefaultApiRateLimits;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [GetDefaultApiRateLimits],
    }).compile();

    useCase = moduleRef.get<GetDefaultApiRateLimits>(GetDefaultApiRateLimits);
  });

  it('should use the default API rate limits when no environment variables are set', () => {
    expect(useCase.defaultApiRateLimits).to.deep.equal(DEFAULT_API_RATE_LIMITS);
  });

  it('should override default API rate limits with environment variables', () => {
    const mockOverrideRateLimit = 65;
    const mockRateLimitServiceLevel = ApiServiceLevelTypeEnum.FREE;
    const mockRateLimitCategory = ApiRateLimitCategoryTypeEnum.GLOBAL;

    const envVarName: ApiRateLimitEnvVarFormat = `API_RATE_LIMIT_${
      ApiServiceLevelTypeEnum.FREE.toUpperCase() as Uppercase<ApiServiceLevelTypeEnum>
    }_${ApiRateLimitCategoryTypeEnum.GLOBAL.toUpperCase() as Uppercase<ApiRateLimitCategoryTypeEnum>}`;
    process.env[envVarName] = mockOverrideRateLimit.toString();

    // Re-initialize the defaultApiRateLimits after setting the environment variable
    useCase.loadApiRateLimits();
    const result = useCase.defaultApiRateLimits;

    expect(result[mockRateLimitServiceLevel][mockRateLimitCategory]).to.equal(mockOverrideRateLimit);
    delete process.env[envVarName]; // cleanup
  });
});
