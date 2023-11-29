import { Test } from '@nestjs/testing';
import { GetApiRateLimitAlgorithmConfig } from './get-api-rate-limit-algorithm-config.usecase';
import {
  ApiRateLimitAlgorithmEnum,
  ApiRateLimitAlgorithmEnvVarFormat,
  DEFAULT_API_RATE_LIMIT_ALGORITHM_CONFIG,
} from '@novu/shared';
import { expect } from 'chai';

describe('GetApiRateLimitAlgorithmConfig', () => {
  let useCase: GetApiRateLimitAlgorithmConfig;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [GetApiRateLimitAlgorithmConfig],
    }).compile();

    useCase = moduleRef.get<GetApiRateLimitAlgorithmConfig>(GetApiRateLimitAlgorithmConfig);
  });

  it('should use the default rate limit algorithm config when no environment variables are set', () => {
    expect(useCase.default).to.deep.equal(DEFAULT_API_RATE_LIMIT_ALGORITHM_CONFIG);
  });

  it('should override default rate limit algorithm config with environment variables', () => {
    const mockOverrideBurstAllowance = 0.2;
    const mockApiRateLimitConfigurationKey = ApiRateLimitAlgorithmEnum.BURST_ALLOWANCE;

    const envVarName: ApiRateLimitAlgorithmEnvVarFormat = `API_RATE_LIMIT_ALGORITHM_${
      mockApiRateLimitConfigurationKey.toUpperCase() as Uppercase<ApiRateLimitAlgorithmEnum>
    }`;
    process.env[envVarName] = `${mockOverrideBurstAllowance}`;

    // Re-initialize the defaultApiRateLimits after setting the environment variable
    useCase.loadDefault();
    const result = useCase.default;

    expect(result[mockApiRateLimitConfigurationKey]).to.equal(mockOverrideBurstAllowance);
    delete process.env[envVarName]; // cleanup
  });
});
