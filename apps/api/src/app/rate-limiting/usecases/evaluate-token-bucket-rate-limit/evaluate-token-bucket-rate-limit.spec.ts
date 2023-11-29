import { expect } from 'chai';
import { EvaluateTokenBucketRateLimit } from './evaluate-token-bucket-rate-limit.usecase';
import { CacheService, cacheService as inMemoryCacheService } from '@novu/application-generic';
import { SharedModule } from '../../../shared/shared.module';
import { RateLimitingModule } from '../../rate-limiting.module';
import { Test } from '@nestjs/testing';
import * as sinon from 'sinon';
import { EvaluateTokenBucketRateLimitCommand } from './evaluate-token-bucket-rate-limit.command';
import { v4 as uuid } from 'uuid';

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

    describe.skip('Redis EVAL script benchmarks', () => {
      type TestCase = {
        /**
         * Test scenario description
         */
        description: string;
        /**
         * Total number of requests to simulate
         */
        totalRequests: number;
        /**
         * Proportion of requests that have a unique identifier
         */
        proportionUniqueIds: number;
        /**
         * Proportion of requests that are throttled
         */
        proportionThrottled: number;
        /**
         * Proportion of requests that are high cost
         */
        proportionHighCost: number;
        /**
         * The proportion of the window duration to jitter the request duration by.
         * Low value to simulate burst request patterns.
         * High value to simulate sustained request patterns.
         */
        proportionJitter: number;
        /**
         * Expected maximum total evaluation duration in milliseconds
         */
        expectedTotalTimeMs: number;
        /**
         * Expected average evaluation duration in milliseconds
         */
        expectedAverageTimeMs: number;
        /**
         * Expected nth percentile evaluation duration in milliseconds
         */
        expectedNthPercentileTimeMs: number;
      };

      const testCases: TestCase[] = [
        {
          description: 'Low Load - 0% Throttled - Sustained Single Window',
          totalRequests: 5000,
          proportionUniqueIds: 0.5,
          proportionThrottled: 0,
          proportionHighCost: 0,
          proportionJitter: 0.8,
          expectedTotalTimeMs: 1000,
          expectedAverageTimeMs: 10,
          expectedNthPercentileTimeMs: 30,
        },
        {
          description: 'Medium Load - 0% Throttled - Sustained Single Window',
          totalRequests: 10000,
          proportionUniqueIds: 0.5,
          proportionThrottled: 0,
          proportionHighCost: 0,
          proportionJitter: 0.8,
          expectedTotalTimeMs: 1000,
          expectedAverageTimeMs: 20,
          expectedNthPercentileTimeMs: 50,
        },
        {
          description: 'High Load - 0% Throttled - Sustained Single Window',
          totalRequests: 20000,
          proportionUniqueIds: 0.5,
          proportionThrottled: 0,
          proportionHighCost: 0,
          proportionJitter: 0.8,
          expectedTotalTimeMs: 1000,
          expectedAverageTimeMs: 200,
          expectedNthPercentileTimeMs: 500,
        },
        {
          description: 'Extreme Load - 0% Throttled - Sustained Single Window',
          totalRequests: 40000,
          proportionUniqueIds: 0.5,
          proportionThrottled: 0,
          proportionHighCost: 0,
          proportionJitter: 0.8,
          expectedTotalTimeMs: 2000,
          expectedAverageTimeMs: 500,
          expectedNthPercentileTimeMs: 2000,
        },
        {
          description: 'High Load - 0% Throttled - Burst Single Window',
          totalRequests: 20000,
          proportionUniqueIds: 0.5,
          proportionThrottled: 0,
          proportionHighCost: 0,
          proportionJitter: 0.2,
          expectedTotalTimeMs: 1000,
          expectedAverageTimeMs: 500,
          expectedNthPercentileTimeMs: 1000,
        },
        {
          description: 'Extreme Load - 0% Throttled - Burst Single Window',
          totalRequests: 40000,
          proportionUniqueIds: 0.5,
          proportionThrottled: 0,
          proportionHighCost: 0,
          proportionJitter: 0.2,
          expectedTotalTimeMs: 3000,
          expectedAverageTimeMs: 1500,
          expectedNthPercentileTimeMs: 2000,
        },
        {
          description: 'High Load - 50% Throttled - Burst Single Window',
          totalRequests: 20000,
          proportionUniqueIds: 0.5,
          proportionThrottled: 0.5,
          proportionHighCost: 0,
          proportionJitter: 0.2,
          expectedTotalTimeMs: 1000,
          expectedAverageTimeMs: 500,
          expectedNthPercentileTimeMs: 1000,
        },
        {
          description: 'High Load - 50% Throttled - Sustained Single Window',
          totalRequests: 20000,
          proportionUniqueIds: 0.5,
          proportionThrottled: 0.5,
          proportionHighCost: 0,
          proportionJitter: 0.8,
          expectedTotalTimeMs: 1000,
          expectedAverageTimeMs: 500,
          expectedNthPercentileTimeMs: 500,
        },
        {
          description: 'High Load - 50% Throttled & 50% High-Cost - Sustained Multiple Windows',
          totalRequests: 40000,
          proportionUniqueIds: 0.5,
          proportionThrottled: 0.5,
          proportionHighCost: 0.5,
          proportionJitter: 2.2,
          expectedTotalTimeMs: 3000,
          expectedAverageTimeMs: 30,
          expectedNthPercentileTimeMs: 100,
        },
        {
          description: 'Extreme Load - 50% Throttled & 50% High-Cost - Sustained Multiple Windows',
          totalRequests: 80000,
          proportionUniqueIds: 0.5,
          proportionThrottled: 0.5,
          proportionHighCost: 0.5,
          proportionJitter: 2.2,
          expectedTotalTimeMs: 4000,
          expectedAverageTimeMs: 1000,
          expectedNthPercentileTimeMs: 1500,
        },
        {
          description: 'High Load - 50% Throttled & 90% High-Cost - Sustained Multiple Windows',
          totalRequests: 40000,
          proportionUniqueIds: 0.5,
          proportionThrottled: 0.5,
          proportionHighCost: 0.9,
          proportionJitter: 2.2,
          expectedTotalTimeMs: 3000,
          expectedAverageTimeMs: 50,
          expectedNthPercentileTimeMs: 200,
        },
        {
          description: 'High Load - 50% Throttled & 0% Unique - Sustained Multiple Windows',
          totalRequests: 40000,
          proportionUniqueIds: 0,
          proportionThrottled: 0.5,
          proportionHighCost: 0,
          proportionJitter: 2.2,
          expectedTotalTimeMs: 3000,
          expectedAverageTimeMs: 30,
          expectedNthPercentileTimeMs: 200,
        },
        {
          description: 'High Load - 50% Throttled & 100% Unique - Sustained Multiple Windows',
          totalRequests: 40000,
          proportionUniqueIds: 1,
          proportionThrottled: 0.5,
          proportionHighCost: 0,
          proportionJitter: 2.2,
          expectedTotalTimeMs: 3000,
          expectedAverageTimeMs: 30,
          expectedNthPercentileTimeMs: 100,
        },
      ];
      const mockLowCost = 1;
      const mockHighCost = 10;
      const mockWindowDuration = 1;
      const mockWindowDurationMs = mockWindowDuration * 1000;
      const mockProportionRefill = 0.5;

      const testThrottledCountErrorTolerance = 0.2;
      const testPercentile = 0.95;

      function printHistogram(results) {
        // Define the number of bins for the histogram
        const bins = 10;

        // Find the maximum duration to scale the histogram
        const maxDuration = Math.max(...results.map((r) => r.duration));

        // Initialize an array for the histogram bins
        const histogram = Array(bins).fill(0);

        // Populate the histogram bins
        results.forEach((result) => {
          const index = Math.floor((result.duration / maxDuration) * bins);
          histogram[index < bins ? index : bins - 1]++;
        });

        // Find the maximum bin count to scale the histogram height
        const maxCount = Math.max(...histogram);

        // Print the histogram
        console.log(`\t  Request Time (ms)`);
        histogram.forEach((count, i) => {
          const bar = '*'.repeat((count / maxCount) * 50); // Scale to a max width of 50 "*"
          console.log(`\t  ${(((i + 1) / bins) * maxDuration).toFixed(2).padStart(7)}: ${bar}`);
        });
      }

      testCases
        .map(
          ({
            description,
            totalRequests,
            proportionUniqueIds,
            proportionThrottled,
            proportionHighCost,
            proportionJitter,
            expectedAverageTimeMs,
            expectedNthPercentileTimeMs,
            expectedTotalTimeMs,
          }) => {
            return () => {
              describe(description, () => {
                let testContext;
                let results: Array<{ duration: number; success: boolean }>;
                let totalTime: number;
                let averageTime: number;
                let successCount: number;
                let throttledCount: number;
                let variance: number;
                let stdev: number;
                let nthPercentile: number;

                const maxTokens = Math.ceil(totalRequests * (1 - proportionThrottled));
                const uniqueIdRequests = Math.max(1, Math.floor(totalRequests * proportionUniqueIds));
                const uniqueIds = Array.from({ length: uniqueIdRequests }).map(() => uuid());
                const mockRepeatId = uuid();
                const maxJitterMs = mockWindowDurationMs * proportionJitter;

                const refillPerWindow = (maxTokens * mockProportionRefill) / mockWindowDuration;

                before(async () => {
                  const cacheService = await inMemoryCacheService.useFactory();
                  testContext = {
                    redis: EvaluateTokenBucketRateLimit.getCacheClient(cacheService),
                  };

                  const proms = Array.from({ length: totalRequests }).map(async (_val, index) => {
                    const cost = Math.random() < proportionHighCost ? mockHighCost : mockLowCost;
                    /**
                     * Distribute unique ids with request allocation skewed left.
                     * matching an expected distribution of requests per unique API client, where:
                     * - the majority of clients make a small number of requests
                     * - a small number of clients make a large number of requests
                     *
                     * Number of Requests per Unique Id
                     * ID Requests
                     *  1 *
                     *  2 **
                     *  3 ****
                     *  4 ******
                     *  5 *********
                     *  6 *************
                     *  7 *****************
                     *  8 ***********************
                     *  9 ********************************
                     * 10 *******************************************
                     */
                    const id =
                      Math.random() < proportionUniqueIds
                        ? uniqueIds[Math.floor((index / totalRequests) * uniqueIds.length)]
                        : mockRepeatId;

                    const jitter = Math.floor(Math.random() * maxJitterMs);
                    await new Promise((resolve) => setTimeout(resolve, jitter));
                    const start = Date.now();
                    const limit = EvaluateTokenBucketRateLimit.tokenBucketLimiter(
                      refillPerWindow,
                      mockWindowDuration,
                      maxTokens,
                      cost
                    );
                    const { success } = await limit(testContext, id);
                    const end = Date.now();
                    const duration = end - start;

                    return {
                      duration,
                      success,
                    };
                  });

                  const startAll = Date.now();
                  results = await Promise.all(proms);
                  const endAll = Date.now();

                  totalTime = endAll - startAll;
                  averageTime = results.reduce((acc, val) => acc + val.duration, 0) / results.length;
                  variance =
                    results.reduce((acc, val) => acc + Math.pow(val.duration - averageTime, 2), 0) / results.length;
                  stdev = Math.sqrt(variance);
                  nthPercentile = results.sort((a, b) => a.duration - b.duration)[
                    Math.floor(results.length * testPercentile)
                  ].duration;
                  successCount = results.filter(({ success }) => success).length;
                  throttledCount = totalRequests - successCount;

                  console.log(
                    `\t  Params:  Total Req: ${totalRequests.toLocaleString()}\tUsers: ${uniqueIdRequests.toLocaleString()}\tThrottled: ${
                      proportionThrottled * 100
                    }%\tHigh Cost: ${proportionHighCost * 100}%\tJitter: ${maxJitterMs}ms`
                  );
                  console.log(
                    `\t  Stats:   Total Time: ${totalTime.toLocaleString()}ms\tAvg: ${averageTime.toFixed(
                      1
                    )}ms\tStdev: ${stdev.toFixed(1)}\tp(${
                      testPercentile * 100
                    }): ${nthPercentile}\tThrottled: ${throttledCount.toLocaleString()}`
                  );
                  printHistogram(results);
                });

                describe('Script Performance', () => {
                  it(`should be able to process ${totalRequests.toLocaleString()} evaluations in less than ${expectedTotalTimeMs}ms`, async () => {
                    expect(totalTime).to.be.lessThan(expectedTotalTimeMs);
                  });

                  it(`should have average evaluation duration less than ${expectedAverageTimeMs}ms`, async () => {
                    expect(averageTime).to.be.lessThan(expectedAverageTimeMs);
                  });

                  it(`should have ${
                    testPercentile * 100
                  }th percentile evaluation duration less than ${expectedNthPercentileTimeMs}ms`, async () => {
                    expect(nthPercentile).to.be.lessThan(expectedNthPercentileTimeMs);
                  });
                });

                describe('Script Throttle Evaluation', () => {
                  const proportionRequestsPerWindow =
                    maxJitterMs > mockWindowDurationMs ? mockWindowDurationMs / maxJitterMs : 1;
                  const totalRequestsPerWindow = Math.floor(totalRequests * proportionRequestsPerWindow);
                  const uniqueRequestsPerWindow = Math.floor(totalRequestsPerWindow * (1 - proportionThrottled));
                  const expectedPerRequestCost =
                    (1 - proportionHighCost) * mockLowCost + proportionHighCost * mockHighCost;

                  const expectedWindowCost = uniqueRequestsPerWindow * expectedPerRequestCost;
                  const firstWindowThrottledRequests =
                    expectedWindowCost > maxTokens ? (expectedWindowCost - maxTokens) / expectedPerRequestCost : 0;
                  const secondWindowMaxTokens = Math.max(
                    maxTokens,
                    maxTokens - firstWindowThrottledRequests + refillPerWindow
                  );
                  const secondWindowThrottledRequests =
                    expectedWindowCost > secondWindowMaxTokens
                      ? (expectedWindowCost - secondWindowMaxTokens) / expectedPerRequestCost
                      : 0;

                  const expectedThrottledCount = firstWindowThrottledRequests + secondWindowThrottledRequests;
                  const expectedThrottledCountMin = Math.floor(
                    expectedThrottledCount * (1 - testThrottledCountErrorTolerance)
                  );
                  const expectedThrottledCountMax = Math.floor(
                    expectedThrottledCount * (1 + testThrottledCountErrorTolerance)
                  );

                  it(`should throttle between ${expectedThrottledCountMin} and ${expectedThrottledCountMax} requests`, async () => {
                    expect(throttledCount).to.be.greaterThanOrEqual(expectedThrottledCountMin);
                    expect(throttledCount).to.be.lessThanOrEqual(expectedThrottledCountMax);
                  });
                });
              });
            };
          }
        )
        .forEach((testCase) => testCase());
    });
  });
});
