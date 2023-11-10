import { Test } from '@nestjs/testing';
import { GetApiRateLimitConfiguration } from './get-api-rate-limit-configuration.usecase';
import {
  ApiRateLimitConfigurationEnum,
  ApiRateLimitConfigurationEnvVarFormat,
  DEFAULT_API_RATE_LIMIT_CONFIGURATION,
} from '@novu/shared';
import { expect } from 'chai';

describe('GetDefaultApiRateLimits', () => {
  let useCase: GetApiRateLimitConfiguration;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [GetApiRateLimitConfiguration],
    }).compile();

    useCase = moduleRef.get<GetApiRateLimitConfiguration>(GetApiRateLimitConfiguration);
  });

  it('should use the default API rate limit configuration when no environment variables are set', () => {
    expect(useCase.defaultApiRateLimitConfiguration).to.deep.equal(DEFAULT_API_RATE_LIMIT_CONFIGURATION);
  });

  it('should override default API rate limit configuration with environment variables', () => {
    const mockOverrideBurstAllowance = 0.2;
    const mockApiRateLimitConfigurationKey = ApiRateLimitConfigurationEnum.BURST_ALLOWANCE;

    const envVarName: ApiRateLimitConfigurationEnvVarFormat = `API_RATE_LIMIT_${
      mockApiRateLimitConfigurationKey.toUpperCase() as Uppercase<ApiRateLimitConfigurationEnum>
    }`;
    process.env[envVarName] = mockOverrideBurstAllowance.toString();

    // Re-initialize the defaultApiRateLimits after setting the environment variable
    useCase.loadApiRateLimitConfiguration();
    const result = useCase.defaultApiRateLimitConfiguration;

    expect(result[mockApiRateLimitConfigurationKey]).to.equal(mockOverrideBurstAllowance);
    delete process.env[envVarName]; // cleanup
  });
});
