import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { ApiRateLimitCategoryEnum, ApiRateLimitCostEnum, ApiServiceLevelEnum } from '@novu/shared';
import { HttpResponseHeaderKeysEnum } from '../../shared/framework/types';

const mockSingleCost = 1;
const mockBulkCost = 5;
const mockWindowDuration = 5;
const mockBurstAllowance = 1;
const mockMaximumFreeTrigger = 5;
const mockMaximumFreeGlobal = 3;
const mockMaximumUnlimitedTrigger = 10;
const mockMaximumUnlimitedGlobal = 5;

process.env.API_RATE_LIMIT_COST_SINGLE = `${mockSingleCost}`;
process.env.API_RATE_LIMIT_COST_BULK = `${mockBulkCost}`;
process.env.API_RATE_LIMIT_ALGORITHM_WINDOW_DURATION = `${mockWindowDuration}`;
process.env.API_RATE_LIMIT_ALGORITHM_BURST_ALLOWANCE = `${mockBurstAllowance}`;
process.env.API_RATE_LIMIT_MAXIMUM_FREE_TRIGGER = `${mockMaximumFreeTrigger}`;
process.env.API_RATE_LIMIT_MAXIMUM_FREE_GLOBAL = `${mockMaximumFreeGlobal}`;
process.env.API_RATE_LIMIT_MAXIMUM_UNLIMITED_TRIGGER = `${mockMaximumUnlimitedTrigger}`;
process.env.API_RATE_LIMIT_MAXIMUM_UNLIMITED_GLOBAL = `${mockMaximumUnlimitedGlobal}`;

process.env.LAUNCH_DARKLY_SDK_KEY = ''; // disable Launch Darkly to allow test to define FF state

describe('API Rate Limiting', () => {
  let session: UserSession;
  const pathPrefix = '/v1/rate-limiting';
  let request: (
    path: string,
    authHeader?: string
  ) => Promise<Awaited<ReturnType<typeof UserSession.prototype.testAgent.get>>>;

  describe('Guard logic', () => {
    beforeEach(async () => {
      process.env.IS_API_RATE_LIMITING_ENABLED = 'true';

      session = new UserSession();
      await session.initialize();

      request = (path: string, authHeader = `ApiKey ${session.apiKey}`) =>
        session.testAgent.get(path).set('authorization', authHeader);
    });

    describe('Feature Flag', () => {
      it('should set rate limit headers when the Feature Flag is enabled', async () => {
        process.env.IS_API_RATE_LIMITING_ENABLED = 'true';
        const response = await request(pathPrefix + '/no-category-no-cost');

        expect(response.headers[HttpResponseHeaderKeysEnum.RATELIMIT_LIMIT.toLowerCase()]).to.exist;
      });

      it('should NOT set rate limit headers when the Feature Flag is disabled', async () => {
        process.env.IS_API_RATE_LIMITING_ENABLED = 'false';
        const response = await request(pathPrefix + '/no-category-no-cost');

        expect(response.headers[HttpResponseHeaderKeysEnum.RATELIMIT_LIMIT.toLowerCase()]).not.to.exist;
      });
    });

    describe('Allowed Authentication Security Schemes', () => {
      it('should set rate limit headers when ApiKey security scheme is used to authenticate', async () => {
        const response = await request(pathPrefix + '/no-category-no-cost', `ApiKey ${session.apiKey}`);

        expect(response.headers[HttpResponseHeaderKeysEnum.RATELIMIT_LIMIT.toLowerCase()]).to.exist;
      });

      it('should NOT set rate limit headers when a Bearer security scheme is used to authenticate', async () => {
        const response = await request(pathPrefix + '/no-category-no-cost', session.token);

        expect(response.headers[HttpResponseHeaderKeysEnum.RATELIMIT_LIMIT.toLowerCase()]).not.to.exist;
      });

      it('should NOT set rate limit headers when NO authorization header is present', async () => {
        const response = await request(pathPrefix + '/no-category-no-cost', '');

        expect(response.headers[HttpResponseHeaderKeysEnum.RATELIMIT_LIMIT.toLowerCase()]).not.to.exist;
      });
    });

    describe('RateLimit-Policy', () => {
      const testParams: Array<{ name: string; expectedRegex: string }> = [
        { name: 'limit', expectedRegex: `${mockMaximumUnlimitedGlobal * mockWindowDuration}` },
        { name: 'w', expectedRegex: `w=${mockWindowDuration}` },
        {
          name: 'burst',
          expectedRegex: `burst=${mockMaximumUnlimitedGlobal * (1 + mockBurstAllowance) * mockWindowDuration}`,
        },
        { name: 'comment', expectedRegex: `comment="[a-zA-Z ]*"` },
        { name: 'category', expectedRegex: `category="(${Object.values(ApiRateLimitCategoryEnum).join('|')})"` },
        { name: 'cost', expectedRegex: `cost="(${Object.values(ApiRateLimitCostEnum).join('|')})"` },
        {
          name: 'serviceLevel',
          expectedRegex: `serviceLevel="[a-zA-Z]*"`,
        },
      ];

      testParams.forEach(({ name, expectedRegex }) => {
        it(`should include the ${name} parameter`, async () => {
          const response = await request(pathPrefix + '/no-category-no-cost');
          const policyHeader = response.headers[HttpResponseHeaderKeysEnum.RATELIMIT_POLICY.toLowerCase()];

          expect(policyHeader).to.match(new RegExp(expectedRegex));
        });
      });

      it('should separate the params with a semicolon', async () => {
        const response = await request(pathPrefix + '/no-category-no-cost');
        const policyHeader = response.headers[HttpResponseHeaderKeysEnum.RATELIMIT_POLICY.toLowerCase()];

        expect(policyHeader.split(';')).to.have.lengthOf(testParams.length);
      });
    });

    describe('Rate Limit Decorators', () => {
      describe('Controller WITHOUT Decorators', () => {
        const controllerPathPrefix = '/v1/rate-limiting';

        it('should use the global category for an endpoint WITHOUT category decorator', async () => {
          const response = await request(controllerPathPrefix + '/no-category-no-cost');
          const policyHeader = response.headers[HttpResponseHeaderKeysEnum.RATELIMIT_POLICY.toLowerCase()];

          expect(policyHeader).to.contain(`category="${ApiRateLimitCategoryEnum.GLOBAL}"`);
        });

        it('should use the single cost for an endpoint WITHOUT cost decorator', async () => {
          const response = await request(controllerPathPrefix + '/no-category-no-cost');
          const policyHeader = response.headers[HttpResponseHeaderKeysEnum.RATELIMIT_POLICY.toLowerCase()];

          expect(policyHeader).to.contain(`cost="${ApiRateLimitCostEnum.SINGLE}"`);
        });
      });

      describe('Controller WITH Decorators', () => {
        const controllerPathPrefix = '/v1/rate-limiting-trigger-bulk';

        it('should use the category decorator defined on the controller for an endpoint WITHOUT category decorator', async () => {
          const response = await request(controllerPathPrefix + '/no-category-no-cost-override');
          const policyHeader = response.headers[HttpResponseHeaderKeysEnum.RATELIMIT_POLICY.toLowerCase()];

          expect(policyHeader).to.contain(`category="${ApiRateLimitCategoryEnum.TRIGGER}"`);
        });

        it('should use the cost decorator defined on the controller for an endpoint WITHOUT cost decorator', async () => {
          const response = await request(controllerPathPrefix + '/no-category-no-cost-override');
          const policyHeader = response.headers[HttpResponseHeaderKeysEnum.RATELIMIT_POLICY.toLowerCase()];

          expect(policyHeader).to.contain(`cost="${ApiRateLimitCostEnum.BULK}"`);
        });

        it('should override the cost decorator defined on the controller for an endpoint WITH cost decorator', async () => {
          const response = await request(controllerPathPrefix + '/no-category-single-cost-override');
          const policyHeader = response.headers[HttpResponseHeaderKeysEnum.RATELIMIT_POLICY.toLowerCase()];

          expect(policyHeader).to.contain(`cost="${ApiRateLimitCostEnum.SINGLE}"`);
        });

        it('should override the category decorator defined on the controller for an endpoint WITH category decorator', async () => {
          const response = await request(controllerPathPrefix + '/global-category-no-cost-override');
          const policyHeader = response.headers[HttpResponseHeaderKeysEnum.RATELIMIT_POLICY.toLowerCase()];

          expect(policyHeader).to.contain(`category="${ApiRateLimitCategoryEnum.GLOBAL}"`);
        });
      });
    });
  });

  describe('Scenarios', () => {
    type TestCase = {
      name: string;
      requests: { path: string; count: number }[];
      expectedStatus: number;
      expectedLimit: number;
      expectedCost: number;
      expectedReset: number;
      expectedRetryAfter?: number;
      expectedThrottledRequests: number;
      setupTest?: (userSession: UserSession) => Promise<void>;
    };

    const testCases: TestCase[] = [
      {
        name: 'single trigger endpoint request',
        requests: [{ path: '/trigger-category-single-cost', count: 1 }],
        expectedStatus: 200,
        expectedLimit: mockMaximumUnlimitedTrigger,
        expectedCost: mockSingleCost * 1,
        expectedReset: 1,
        expectedThrottledRequests: 0,
      },
      {
        name: 'no category no cost endpoint request',
        requests: [{ path: '/no-category-no-cost', count: 1 }],
        expectedStatus: 200,
        expectedLimit: mockMaximumUnlimitedGlobal,
        expectedCost: mockSingleCost * 1,
        expectedReset: 1,
        expectedThrottledRequests: 0,
      },
      {
        name: 'single trigger request with service level specified on organization ',
        requests: [{ path: '/trigger-category-single-cost', count: 1 }],
        expectedStatus: 200,
        expectedLimit: mockMaximumFreeTrigger,
        expectedCost: mockSingleCost * 1,
        expectedReset: 1,
        expectedThrottledRequests: 0,
        async setupTest(userSession) {
          await userSession.updateOrganizationServiceLevel(ApiServiceLevelEnum.FREE);
        },
      },
      {
        name: 'single trigger request with maximum rate limit specified on environment',
        requests: [{ path: '/trigger-category-single-cost', count: 1 }],
        expectedStatus: 200,
        expectedLimit: 60,
        expectedCost: mockSingleCost * 1,
        expectedReset: 1,
        expectedThrottledRequests: 0,
        async setupTest(userSession) {
          await userSession.updateEnvironmentApiRateLimits({ [ApiRateLimitCategoryEnum.TRIGGER]: 60 });
        },
      },
      {
        name: 'combination of single trigger and single global endpoint request',
        requests: [
          { path: '/trigger-category-single-cost', count: 20 },
          { path: '/global-category-single-cost', count: 100 },
        ],
        expectedStatus: 429,
        expectedLimit: mockMaximumUnlimitedGlobal,
        expectedCost: mockSingleCost * 100,
        expectedReset: 1,
        expectedRetryAfter: 1,
        expectedThrottledRequests: 50,
      },
      {
        name: 'bulk trigger endpoint request',
        requests: [{ path: '/trigger-category-bulk-cost', count: 1 }],
        expectedStatus: 200,
        expectedLimit: mockMaximumUnlimitedTrigger,
        expectedCost: mockBulkCost * 1,
        expectedReset: 1,
        expectedThrottledRequests: 0,
      },
      {
        name: 'bulk global endpoint request',
        requests: [{ path: '/global-category-bulk-cost', count: 20 }],
        expectedStatus: 429,
        expectedLimit: mockMaximumUnlimitedGlobal,
        expectedCost: mockBulkCost * 20,
        expectedReset: 1,
        expectedRetryAfter: 1,
        expectedThrottledRequests: 10,
      },
      {
        name: 'combination of single trigger and bulk trigger endpoint request',
        requests: [
          { path: '/trigger-category-single-cost', count: 2 },
          { path: '/trigger-category-bulk-cost', count: 1 },
        ],
        expectedStatus: 200,
        expectedLimit: mockMaximumUnlimitedTrigger,
        expectedCost: mockSingleCost * 2 + mockBulkCost * 1,
        expectedReset: 1,
        expectedThrottledRequests: 0,
      },
      {
        name: 'bulk trigger request with service level specified on organization and maximum rate limit specified on environment',
        requests: [{ path: '/trigger-category-bulk-cost', count: 5 }],
        expectedStatus: 429,
        expectedLimit: 1,
        expectedCost: mockBulkCost * 5,
        expectedReset: 5,
        expectedRetryAfter: 5,
        expectedThrottledRequests: 3,
        async setupTest(userSession) {
          await userSession.updateOrganizationServiceLevel(ApiServiceLevelEnum.FREE);
          await userSession.updateEnvironmentApiRateLimits({ [ApiRateLimitCategoryEnum.TRIGGER]: 1 });
        },
      },
      {
        name: 'combination of bulk trigger and bulk global endpoint request',
        requests: [
          { path: '/trigger-category-bulk-cost', count: 40 },
          { path: '/global-category-bulk-cost', count: 40 },
        ],
        expectedStatus: 429,
        expectedLimit: mockMaximumUnlimitedGlobal,
        expectedCost: mockBulkCost * 40,
        expectedReset: 1,
        expectedRetryAfter: 1,
        expectedThrottledRequests: 50,
      },
    ];

    testCases
      .map(
        ({
          name,
          requests,
          expectedStatus,
          expectedLimit,
          expectedCost,
          expectedReset,
          expectedRetryAfter,
          expectedThrottledRequests,
          setupTest,
        }) => {
          return () => {
            describe(`${expectedStatus === 429 ? 'Throttled' : 'Allowed'} ${name}`, () => {
              let lastResponse: ReturnType<typeof UserSession.prototype.testAgent.get>;
              let throttledResponseCount = 0;
              const throttledResponseCountTolerance = 0.5;
              const expectedWindowLimit = expectedLimit * mockWindowDuration;
              const expectedBurstLimit = expectedWindowLimit * (1 + mockBurstAllowance);
              const expectedRemaining = Math.max(0, expectedBurstLimit - expectedCost);

              before(async () => {
                process.env.IS_API_RATE_LIMITING_ENABLED = 'true';

                session = new UserSession();
                await session.initialize();

                request = (path: string, authHeader = `ApiKey ${session.apiKey}`) =>
                  session.testAgent.get(path).set('authorization', authHeader);

                setupTest && (await setupTest(session));
                for (const { path, count } of requests) {
                  for (let index = 0; index < count; index++) {
                    const response = await request(pathPrefix + path);
                    lastResponse = response;

                    if (response.statusCode === 429) {
                      throttledResponseCount++;
                    }
                  }
                }
              });

              it(`should return a ${expectedStatus} status code`, async () => {
                expect(lastResponse.statusCode).to.equal(expectedStatus);
              });

              it(`should return a ${HttpResponseHeaderKeysEnum.RATELIMIT_LIMIT} header of ${expectedWindowLimit}`, async () => {
                expect(lastResponse.headers[HttpResponseHeaderKeysEnum.RATELIMIT_LIMIT.toLowerCase()]).to.equal(
                  `${expectedWindowLimit}`
                );
              });

              it(`should return a ${HttpResponseHeaderKeysEnum.RATELIMIT_REMAINING} header of ${expectedRemaining}`, async () => {
                expect(lastResponse.headers[HttpResponseHeaderKeysEnum.RATELIMIT_REMAINING.toLowerCase()]).to.equal(
                  `${expectedRemaining}`
                );
              });

              it(`should return a ${HttpResponseHeaderKeysEnum.RATELIMIT_RESET} header of ${expectedReset}`, async () => {
                expect(lastResponse.headers[HttpResponseHeaderKeysEnum.RATELIMIT_RESET.toLowerCase()]).to.equal(
                  `${expectedReset}`
                );
              });

              it(`should return a ${HttpResponseHeaderKeysEnum.RETRY_AFTER} header of ${expectedRetryAfter}`, async () => {
                expect(lastResponse.headers[HttpResponseHeaderKeysEnum.RETRY_AFTER.toLowerCase()]).to.equal(
                  expectedRetryAfter && `${expectedRetryAfter}`
                );
              });

              const expectedMinThrottled = Math.floor(
                expectedThrottledRequests * (1 - throttledResponseCountTolerance)
              );
              const expectedMaxThrottled = Math.ceil(expectedThrottledRequests * (1 + throttledResponseCountTolerance));
              it(`should have between ${expectedMinThrottled} and ${expectedMaxThrottled} requests throttled`, async () => {
                expect(throttledResponseCount).to.be.greaterThanOrEqual(expectedMinThrottled);
                expect(throttledResponseCount).to.be.lessThanOrEqual(expectedMaxThrottled);
              });
            });
          };
        }
      )
      .forEach((testCase) => testCase());
  });
});
