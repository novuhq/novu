import { expect } from 'chai';
import { EvaluateTokenBucketRateLimit } from './evaluate-token-bucket-rate-limit.usecase';
import { CacheService } from '@novu/application-generic';
import { SharedModule } from '../../../shared/shared.module';
import { RateLimitingModule } from '../../rate-limiting.module';
import { Test } from '@nestjs/testing';
import * as sinon from 'sinon';
import { EvaluateTokenBucketRateLimitCommand } from './evaluate-token-bucket-rate-limit.command';

describe('EvaluateTokenBucketRateLimit', () => {
  let useCase: EvaluateTokenBucketRateLimit;
  let cacheService: CacheService;

  const mockCommand = EvaluateTokenBucketRateLimitCommand.create({
    identifier: 'test',
    maxTokens: 10,
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

  describe('Cache invocation', () => {
    let cacheServiceEvalStub: sinon.SinonStub;
    let cacheServiceSaddStub: sinon.SinonStub;
    let cacheServiceIsEnabledStub: sinon.SinonStub;

    beforeEach(async () => {
      cacheServiceEvalStub = sinon.stub(cacheService, 'eval');
      cacheServiceSaddStub = sinon.stub(cacheService, 'sadd');
      cacheServiceIsEnabledStub = sinon.stub(cacheService, 'cacheEnabled').returns(true);
    });

    afterEach(() => {
      cacheServiceEvalStub.restore();
      cacheServiceSaddStub.restore();
      cacheServiceIsEnabledStub.restore();
    });

    describe('Cache Errors', () => {
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

    describe('Cache Service Adapter', () => {
      it('should invoke the SADD method with members casted to string', async () => {
        const cacheClient = EvaluateTokenBucketRateLimit.getCacheClient(cacheService);
        const key = 'testKey';
        const members = [1, 2];

        await cacheClient.sadd(key, ...members);

        expect(cacheServiceSaddStub.calledWith(key, ...['1', '2'])).to.equal(true);
      });

      it('should invoke the EVAL function with args casted to string', async () => {
        const cacheClient = EvaluateTokenBucketRateLimit.getCacheClient(cacheService);
        const script = 'return 1';
        const keys = ['key1', 'key2'];
        const args = [1, 2];

        await cacheClient.eval(script, keys, args);

        expect(cacheServiceEvalStub.calledWith(script, keys, ['1', '2'])).to.equal(true);
      });
    });
  });
});
