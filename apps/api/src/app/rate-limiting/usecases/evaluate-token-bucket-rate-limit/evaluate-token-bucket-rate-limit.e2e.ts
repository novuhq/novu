import { expect } from 'chai';
import { CacheInMemoryProviderService, CacheService } from '@novu/application-generic';
import { tokenBucketLimiter } from './evaluate-token-bucket-rate-limit.limiter';

describe('Variable-Cost Token Bucket Algorithm', () => {
  let mockRefillRate: number;
  let mockWindowDuration: number;
  let mockMaxTokens: number;
  let mockCost: number;

  const cacheService = new CacheService(new CacheInMemoryProviderService());
  const testContext = {
    redis: {
      sadd: async (key, ...members) => cacheService.sadd(key, ...members.map((member) => String(member))),
      eval: async (script, keys, args) =>
        cacheService.eval(
          script,
          keys,
          args.map((arg) => String(arg))
        ),
    } as any,
  };

  beforeEach(() => {
    mockRefillRate = 1;
    mockWindowDuration = 1;
    mockMaxTokens = 1;
    mockCost = 1;
  });

  describe('Success', () => {
    it('should return expected success with cost of 1', async () => {
      mockRefillRate = 10;
      mockWindowDuration = 1;
      mockMaxTokens = 10;
      mockCost = 1;

      const id = Date.now().toString();

      const limit = tokenBucketLimiter(mockRefillRate, mockWindowDuration, mockMaxTokens, mockCost);

      // new array of length 10
      const results = await Promise.all(Array.from({ length: 100 }).map(() => limit(testContext, id)));

      const unsuccessful = results.filter((result) => !result.success);
      console.log('unsuccessful.length', unsuccessful.length);

      expect(unsuccessful.length).to.equal(0);
    });
  });
});
