import { expect } from 'chai';
import { EvaluateTokenBucketRateLimit } from './evaluate-token-bucket-rate-limit.usecase';
import { CacheService } from '@novu/application-generic';
import { SharedModule } from '../../../shared/shared.module';
import { RateLimitingModule } from '../../rate-limiting.module';
import { Test } from '@nestjs/testing';
import * as sinon from 'sinon';
import { EvaluateTokenBucketRateLimitCommand } from './evaluate-token-bucket-rate-limit.command';

describe('Variable-Cost Token Bucket Algorithm', () => {
  let useCase: EvaluateTokenBucketRateLimit;
  let cacheService: CacheService;

  const mockCommand = EvaluateTokenBucketRateLimitCommand.create({
    identifier: 'test',
    maxLimit: 10,
    windowDuration: 1,
    cost: 1,
    refillRate: 1,
  });

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SharedModule, RateLimitingModule],
    }).compile();

    useCase = moduleRef.get<EvaluateTokenBucketRateLimit>(EvaluateTokenBucketRateLimit);
    cacheService = moduleRef.get<CacheService>(CacheService);
  });

  describe('Static values', () => {
    it('should have a static algorithm value', () => {
      expect(useCase.algorithm).to.equal('token bucket');
    });
  });

  describe('Cache errors', () => {
    let cacheServiceEvalStub: sinon.SinonStub;
    let cacheServiceIsEnabledStub: sinon.SinonStub;

    beforeEach(async () => {
      cacheServiceEvalStub = sinon.stub(cacheService, 'eval');
      cacheServiceIsEnabledStub = sinon.stub(cacheService, 'cacheEnabled').returns(true);
    });

    afterEach(() => {
      cacheServiceEvalStub.restore();
      cacheServiceIsEnabledStub.restore();
    });

    it('should throw error when a cache operation fails', async () => {
      cacheServiceEvalStub.resolves(new Error());

      try {
        await useCase.execute(mockCommand);
        throw new Error('Should not reach here');
      } catch (e) {
        expect(e.message).to.equal('Failed to evaluate rate limit');
      }
    });

    it('should throw error when cache is not enabled', async () => {
      cacheServiceIsEnabledStub.returns(false);

      try {
        await useCase.execute(mockCommand);
        throw new Error('Should not reach here');
      } catch (e) {
        expect(e.message).to.equal('Rate limiting cache service is not available');
      }
    });
  });
});
