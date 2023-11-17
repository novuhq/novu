import { Test } from '@nestjs/testing';
import { CacheService, MockCacheService } from '@novu/application-generic';
import { EvaluateApiRateLimit, EvaluateApiRateLimitCommand } from './index';
import { UserSession } from '@novu/testing';
import { ApiRateLimitCategoryEnum, ApiRateLimitCostEnum, IApiRateLimitAlgorithm } from '@novu/shared';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { GetApiRateLimitMaximum } from '../get-api-rate-limit-maximum';
import { GetApiRateLimitAlgorithmConfig } from '../get-api-rate-limit-algorithm-config';
import { SharedModule } from '../../../shared/shared.module';
import { RateLimitingModule } from '../../rate-limiting.module';

const mockApiRateLimitConfiguration: IApiRateLimitAlgorithm = {
  burstAllowance: 0.2,
  windowDuration: 2,
};
const mockDefaultLimit = 60;
const mockBurstLimit = 72;
const mockRemaining = mockBurstLimit - 1;
const mockReset = 1699954067112;
const mockApiRateLimitCategory = ApiRateLimitCategoryEnum.GLOBAL;
const mockApiRateLimitCost = ApiRateLimitCostEnum.SINGLE;

describe('EvaluateApiRateLimit', async () => {
  let useCase: EvaluateApiRateLimit;
  let session: UserSession;
  let getApiRateLimit: GetApiRateLimitMaximum;
  let getApiRateLimitConfiguration: GetApiRateLimitAlgorithmConfig;
  let cacheService: CacheService;

  let getApiRateLimitStub: sinon.SinonStub;
  let getApiRateLimitConfigurationStub: sinon.SinonStub;
  let cacheServiceEvalStub: sinon.SinonStub;
  let cacheServiceIsEnabledStub: sinon.SinonStub;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SharedModule, RateLimitingModule],
    })
      .overrideProvider(CacheService)
      .useValue(MockCacheService.createClient())
      .compile();

    session = new UserSession();
    await session.initialize();

    useCase = moduleRef.get<EvaluateApiRateLimit>(EvaluateApiRateLimit);
    getApiRateLimit = moduleRef.get<GetApiRateLimitMaximum>(GetApiRateLimitMaximum);
    getApiRateLimitConfiguration = moduleRef.get<GetApiRateLimitAlgorithmConfig>(GetApiRateLimitAlgorithmConfig);
    cacheService = moduleRef.get<CacheService>(CacheService);

    getApiRateLimitStub = sinon.stub(getApiRateLimit, 'execute').resolves(mockDefaultLimit);
    getApiRateLimitConfigurationStub = sinon
      .stub(getApiRateLimitConfiguration, 'default')
      .value(mockApiRateLimitConfiguration);
    // This mock is uncomfortable because it's dependent on the algorithm implementation,
    // but is a viable workaround due to the `eval` method having a hard dependency on running
    // a Lua script on a Redis instance, which would require further mocking.
    // The first value is the remaining rate limit, the second value is the reset time.
    cacheServiceEvalStub = sinon.stub(cacheService, 'eval').resolves([mockRemaining, mockReset]);
    cacheServiceIsEnabledStub = sinon.stub(cacheService, 'cacheEnabled').returns(true);
  });

  afterEach(() => {
    getApiRateLimitStub.restore();
    getApiRateLimitConfigurationStub.restore();
    cacheServiceEvalStub.restore();
    cacheServiceIsEnabledStub.restore();
  });

  describe('Successful evaluation', () => {
    it('should return a boolean success value', async () => {
      const result = await useCase.execute(
        EvaluateApiRateLimitCommand.create({
          organizationId: session.organization._id,
          environmentId: session.environment._id,
          apiRateLimitCategory: mockApiRateLimitCategory,
          apiRateLimitCost: mockApiRateLimitCost,
        })
      );

      expect(typeof result.success).to.equal('boolean');
    });

    it('should return a non-zero limit', async () => {
      const result = await useCase.execute(
        EvaluateApiRateLimitCommand.create({
          organizationId: session.organization._id,
          environmentId: session.environment._id,
          apiRateLimitCategory: mockApiRateLimitCategory,
          apiRateLimitCost: mockApiRateLimitCost,
        })
      );

      expect(result.limit).to.be.greaterThan(0);
    });

    it('should return a non-zero remaining tokens ', async () => {
      const result = await useCase.execute(
        EvaluateApiRateLimitCommand.create({
          organizationId: session.organization._id,
          environmentId: session.environment._id,
          apiRateLimitCategory: mockApiRateLimitCategory,
          apiRateLimitCost: mockApiRateLimitCost,
        })
      );

      expect(result.remaining).to.be.greaterThan(0);
    });

    it('should return a reset greater than 0', async () => {
      const result = await useCase.execute(
        EvaluateApiRateLimitCommand.create({
          organizationId: session.organization._id,
          environmentId: session.environment._id,
          apiRateLimitCategory: mockApiRateLimitCategory,
          apiRateLimitCost: mockApiRateLimitCost,
        })
      );

      expect(result.reset).to.be.greaterThan(0);
    });

    it('should return the correct refill rate', async () => {
      const testRefillRate = mockDefaultLimit * mockApiRateLimitConfiguration.windowDuration;

      const result = await useCase.execute(
        EvaluateApiRateLimitCommand.create({
          organizationId: session.organization._id,
          environmentId: session.environment._id,
          apiRateLimitCategory: mockApiRateLimitCategory,
          apiRateLimitCost: mockApiRateLimitCost,
        })
      );

      expect(result.refillRate).to.equal(testRefillRate);
    });

    it('should return the correct refill interval', async () => {
      const result = await useCase.execute(
        EvaluateApiRateLimitCommand.create({
          organizationId: session.organization._id,
          environmentId: session.environment._id,
          apiRateLimitCategory: mockApiRateLimitCategory,
          apiRateLimitCost: mockApiRateLimitCost,
        })
      );

      expect(result.windowDuration).to.equal(mockApiRateLimitConfiguration.windowDuration);
    });

    it('should return the correct burst limit', async () => {
      const result = await useCase.execute(
        EvaluateApiRateLimitCommand.create({
          organizationId: session.organization._id,
          environmentId: session.environment._id,
          apiRateLimitCategory: mockApiRateLimitCategory,
          apiRateLimitCost: mockApiRateLimitCost,
        })
      );

      expect(result.burstLimit).to.equal(mockBurstLimit);
    });
  });

  describe('Successful invocation of cache methods', () => {
    it('should call the cache service eval method', async () => {
      await useCase.execute(
        EvaluateApiRateLimitCommand.create({
          organizationId: session.organization._id,
          environmentId: session.environment._id,
          apiRateLimitCategory: mockApiRateLimitCategory,
          apiRateLimitCost: mockApiRateLimitCost,
        })
      );

      expect(cacheServiceEvalStub.calledOnce).to.be.true;
    });

    it('should call the cache service cacheEnabled method', async () => {
      await useCase.execute(
        EvaluateApiRateLimitCommand.create({
          organizationId: session.organization._id,
          environmentId: session.environment._id,
          apiRateLimitCategory: mockApiRateLimitCategory,
          apiRateLimitCost: mockApiRateLimitCost,
        })
      );

      expect(cacheServiceIsEnabledStub.calledOnce).to.be.true;
    });
  });

  describe('Cache errors', () => {
    it('should throw error when a cache operation fails', async () => {
      cacheServiceEvalStub.throws(new Error());

      try {
        await useCase.execute(
          EvaluateApiRateLimitCommand.create({
            organizationId: session.organization._id,
            environmentId: session.environment._id,
            apiRateLimitCategory: mockApiRateLimitCategory,
            apiRateLimitCost: mockApiRateLimitCost,
          })
        );
        throw new Error('Should not reach here');
      } catch (e) {
        expect(e.message).to.equal('Failed to evaluate rate limit');
      }
    });

    it('should throw error when cache is not enabled', async () => {
      cacheServiceIsEnabledStub.returns(false);

      try {
        await useCase.execute(
          EvaluateApiRateLimitCommand.create({
            organizationId: session.organization._id,
            environmentId: session.environment._id,
            apiRateLimitCategory: mockApiRateLimitCategory,
            apiRateLimitCost: mockApiRateLimitCost,
          })
        );
        throw new Error('Should not reach here');
      } catch (e) {
        expect(e.message).to.equal('Rate limiting cache service is not available');
      }
    });
  });
});
