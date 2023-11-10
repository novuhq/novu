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

const mockApiRateLimitConfiguration = { burstAllowance: 0.1, refillInterval: 1 };
const mockDefaultLimit = 60;
const mockBurstLimit = mockDefaultLimit * (1 + mockApiRateLimitConfiguration.burstAllowance);
const mockRemaining = mockBurstLimit - 1;
const mockReset = Date.now() + 1000;

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

    getApiRateLimitStub = sinon.stub(getApiRateLimit, 'execute' as any).resolves(mockDefaultLimit);
    getApiRateLimitConfigurationStub = sinon
      .stub(getApiRateLimitConfiguration, 'defaultApiRateLimitConfiguration' as any)
      .value(mockApiRateLimitConfiguration);
    // The first value is the remaining rate limit, the second value is the reset time
    cacheServiceEvalStub = sinon.stub(cacheService, 'eval' as any).resolves([mockRemaining, mockReset]);
    cacheServiceIsEnabledStub = sinon.stub(cacheService, 'cacheEnabled' as any).returns(true);
  });

  afterEach(() => {
    getApiRateLimitStub.restore();
    getApiRateLimitConfigurationStub.restore();
    cacheServiceEvalStub.restore();
    cacheServiceIsEnabledStub.restore();
  });

  describe('Successful evaluation', () => {
    it('should return success equal to true', async () => {
      cacheServiceEvalStub;

      const result = await useCase.execute(
        EvaluateApiRateLimitCommand.create({
          organizationId: session.organization._id,
          environmentId: session.environment._id,
          apiRateLimitCategory: ApiRateLimitCategoryTypeEnum.GLOBAL,
        })
      );

      expect(result.success).to.be.true;
    });

    it('should return correct limit adjusted for burst capability', async () => {
      cacheServiceEvalStub;

      const result = await useCase.execute(
        EvaluateApiRateLimitCommand.create({
          organizationId: session.organization._id,
          environmentId: session.environment._id,
          apiRateLimitCategory: ApiRateLimitCategoryTypeEnum.GLOBAL,
        })
      );

      expect(result.limit).to.equal(mockBurstLimit);
    });

    it('should return correct remaining tokens', async () => {
      cacheServiceEvalStub;

      const result = await useCase.execute(
        EvaluateApiRateLimitCommand.create({
          organizationId: session.organization._id,
          environmentId: session.environment._id,
          apiRateLimitCategory: ApiRateLimitCategoryTypeEnum.GLOBAL,
        })
      );

      expect(result.remaining).to.equal(mockRemaining);
    });

    it('should return a reset greater than 0', async () => {
      cacheServiceEvalStub;

      const result = await useCase.execute(
        EvaluateApiRateLimitCommand.create({
          organizationId: session.organization._id,
          environmentId: session.environment._id,
          apiRateLimitCategory: ApiRateLimitCategoryTypeEnum.GLOBAL,
        })
      );

      expect(result.reset).to.be.greaterThan(0);
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
            apiRateLimitCategory: ApiRateLimitCategoryTypeEnum.GLOBAL,
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
            apiRateLimitCategory: ApiRateLimitCategoryTypeEnum.GLOBAL,
          })
        );
        throw new Error('Should not reach here');
      } catch (e) {
        expect(e.message).to.equal('Rate limiting cache service is not available');
      }
    });
  });
});
