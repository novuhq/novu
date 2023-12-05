import { Test } from '@nestjs/testing';
import { GetApiRateLimitCostConfig } from './get-api-rate-limit-cost-config.usecase';
import { ApiRateLimitCostEnum, ApiRateLimitCostEnvVarFormat, DEFAULT_API_RATE_LIMIT_COST_CONFIG } from '@novu/shared';
import { expect } from 'chai';

describe('GetApiRateLimitCostConfig', () => {
  let useCase: GetApiRateLimitCostConfig;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [GetApiRateLimitCostConfig],
    }).compile();

    useCase = moduleRef.get<GetApiRateLimitCostConfig>(GetApiRateLimitCostConfig);
  });

  it('should use the default rate limit cost configuration when no environment variables are set', () => {
    expect(useCase.default).to.deep.equal(DEFAULT_API_RATE_LIMIT_COST_CONFIG);
  });

  it('should override default rate limit cost configuration with environment variables', () => {
    const mockOverrideBulkCost = 15;
    const mockApiRateLimitConfigurationKey = ApiRateLimitCostEnum.BULK;

    const envVarName: ApiRateLimitCostEnvVarFormat = `API_RATE_LIMIT_COST_${
      mockApiRateLimitConfigurationKey.toUpperCase() as Uppercase<ApiRateLimitCostEnum>
    }`;
    process.env[envVarName] = `${mockOverrideBulkCost}`;

    // Re-initialize the defaultApiRateLimits after setting the environment variable
    useCase.loadDefault();
    const result = useCase.default;

    expect(result[mockApiRateLimitConfigurationKey]).to.equal(mockOverrideBulkCost);
    delete process.env[envVarName]; // cleanup
  });
});
