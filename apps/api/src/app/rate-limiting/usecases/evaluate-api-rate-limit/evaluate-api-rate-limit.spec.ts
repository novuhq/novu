import { Test } from '@nestjs/testing';
import { Ratelimit } from '@upstash/ratelimit';
import { CacheService, ICacheService, MockCacheService } from '@novu/application-generic';
import { EvaluateApiRateLimit, EvaluateApiRateLimitCommand } from './index';
import { UserSession } from '@novu/testing';
import { ApiRateLimitCategoryTypeEnum } from '@novu/shared';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { GetApiRateLimit } from '../get-api-rate-limit';
import { GetApiRateLimitConfiguration } from '../get-api-rate-limit-configuration';
import { SharedModule } from '../../../shared/shared.module';
import { RateLimitingModule } from '../../rate-limiting.module';

const mockApiRateLimitConfiguration = { burstAllowance: 0.2, refillInterval: 2 };
const mockDefaultLimit = 60;
const mockBurstLimit = 72;
const mockRemaining = mockBurstLimit - 1;
const mockReset = 1699954067112;
const mockApiRateLimitCategory = ApiRateLimitCategoryTypeEnum.GLOBAL;

describe('EvaluateApiRateLimit', async () => {
  let useCase: EvaluateApiRateLimit;
  let session: UserSession;
  let getApiRateLimit: GetApiRateLimit;
  let getApiRateLimitConfiguration: GetApiRateLimitConfiguration;
  let cacheService: ICacheService;

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
    getApiRateLimit = moduleRef.get<GetApiRateLimit>(GetApiRateLimit);
    getApiRateLimitConfiguration = moduleRef.get<GetApiRateLimitConfiguration>(GetApiRateLimitConfiguration);
    cacheService = moduleRef.get<ICacheService>(CacheService);

    getApiRateLimitStub = sinon.stub(getApiRateLimit, 'execute').resolves(mockDefaultLimit);
    getApiRateLimitConfigurationStub = sinon
      .stub(getApiRateLimitConfiguration, 'defaultApiRateLimitConfiguration')
      .value(mockApiRateLimitConfiguration);
    // This mock is slightly uncomfortable because it's dependent on the algorithm implementation,
    // but it is required due to the algorithm having a hard dependency on running a Lua script which
    // would require further mocking.
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
        })
      );

      expect(result.reset).to.be.greaterThan(0);
    });
  });

  describe('Successful invocation of cache methods', () => {
    it('should call the cache service eval method', async () => {
      await useCase.execute(
        EvaluateApiRateLimitCommand.create({
          organizationId: session.organization._id,
          environmentId: session.environment._id,
          apiRateLimitCategory: mockApiRateLimitCategory,
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
          })
        );
        throw new Error('Should not reach here');
      } catch (e) {
        expect(e.message).to.equal('Rate limiting cache service is not available');
      }
    });
  });

  describe('Rate limit algorithm parameters', () => {
    it('should call the rate limit algorithm with the correct refill rate', async () => {
      const rateLimitAlgorithmSpy = sinon.spy(Ratelimit, 'tokenBucket');
      const testRefillRate = mockDefaultLimit * mockApiRateLimitConfiguration.refillInterval;

      await useCase.execute(
        EvaluateApiRateLimitCommand.create({
          organizationId: session.organization._id,
          environmentId: session.environment._id,
          apiRateLimitCategory: mockApiRateLimitCategory,
        })
      );

      expect(rateLimitAlgorithmSpy.getCall(0).args[0]).to.equal(testRefillRate);
    });

    it('should call the rate limit algorithm with the correct refill interval', async () => {
      const rateLimitAlgorithmSpy = sinon.spy(Ratelimit, 'tokenBucket');

      await useCase.execute(
        EvaluateApiRateLimitCommand.create({
          organizationId: session.organization._id,
          environmentId: session.environment._id,
          apiRateLimitCategory: mockApiRateLimitCategory,
        })
      );

      expect(rateLimitAlgorithmSpy.getCall(0).args[1]).to.equal(`${mockApiRateLimitConfiguration.refillInterval} s`);
    });

    it('should call the rate limit algorithm with the correct burst limit', async () => {
      const rateLimitAlgorithmSpy = sinon.spy(Ratelimit, 'tokenBucket');

      await useCase.execute(
        EvaluateApiRateLimitCommand.create({
          organizationId: session.organization._id,
          environmentId: session.environment._id,
          apiRateLimitCategory: mockApiRateLimitCategory,
        })
      );

      expect(rateLimitAlgorithmSpy.getCall(0).args[2]).to.equal(mockBurstLimit);
    });
  });
});
