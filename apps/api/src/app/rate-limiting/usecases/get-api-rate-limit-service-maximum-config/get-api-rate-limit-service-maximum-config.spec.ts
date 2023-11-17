import { Test } from '@nestjs/testing';
import { GetApiRateLimitServiceMaximumConfig } from './get-api-rate-limit-service-maximum-config.usecase';
import {
  ApiRateLimitCategoryEnum,
  ApiRateLimitServiceMaximumEnvVarFormat,
  ApiServiceLevelEnum,
  DEFAULT_API_RATE_LIMIT_SERVICE_MAXIMUM_CONFIG,
} from '@novu/shared';
import { expect } from 'chai';

describe('GetApiRateLimitServiceMaximumConfig', () => {
  let useCase: GetApiRateLimitServiceMaximumConfig;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [GetApiRateLimitServiceMaximumConfig],
    }).compile();

    useCase = moduleRef.get<GetApiRateLimitServiceMaximumConfig>(GetApiRateLimitServiceMaximumConfig);
  });

  it('should use the default API rate limits when no environment variables are set', () => {
    expect(useCase.default).to.deep.equal(DEFAULT_API_RATE_LIMIT_SERVICE_MAXIMUM_CONFIG);
  });

  it('should override default API rate limits with environment variables', () => {
    const mockOverrideRateLimit = 65;
    const mockRateLimitServiceLevel = ApiServiceLevelEnum.FREE;
    const mockRateLimitCategory = ApiRateLimitCategoryEnum.GLOBAL;

    const envVarName: ApiRateLimitServiceMaximumEnvVarFormat = `API_RATE_LIMIT_MAXIMUM_${
      ApiServiceLevelEnum.FREE.toUpperCase() as Uppercase<ApiServiceLevelEnum>
    }_${ApiRateLimitCategoryEnum.GLOBAL.toUpperCase() as Uppercase<ApiRateLimitCategoryEnum>}`;
    process.env[envVarName] = mockOverrideRateLimit.toString();

    // Re-initialize the defaults after setting the environment variable
    useCase.loadDefault();
    const result = useCase.default;

    expect(result[mockRateLimitServiceLevel][mockRateLimitCategory]).to.equal(mockOverrideRateLimit);
    delete process.env[envVarName]; // cleanup
  });
});
