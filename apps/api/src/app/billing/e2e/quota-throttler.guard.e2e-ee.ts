import { CommunityOrganizationRepository } from '@novu/dal';
import {
  GetEventResourceUsage,
  GetSubscription,
  THROTTLED_EXCEPTION_MESSAGE,
  USAGE_LIMIT_PAUSED_EXCEPTION_MESSAGE,
} from '@novu/ee-billing';
import {
  ApiServiceLevelEnum,
  FeatureFlagsKeysEnum,
  GetSubscriptionDto,
  IOrganizationUsageLimits,
  UsageAlertRecipientsEnum,
} from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import sinon from 'sinon';

process.env.LAUNCH_DARKLY_SDK_KEY = ''; // disable Launch Darkly to allow test to define FF state
// process.env.CLERK_ENABLED = 'true';
describe('Resource Limiting #novu-v2', () => {
  let session: UserSession;
  const pathDefault = '/v1/testing/resource-limiting-default';
  const pathEvent = '/v1/testing/resource-limiting-events';
  let request: (
    path: string,
    authHeader?: string
  ) => Promise<Awaited<ReturnType<typeof UserSession.prototype.testAgent.get>>>;

  describe('IS_SELF_HOSTED is true', () => {
    beforeEach(async () => {
      process.env.IS_SELF_HOSTED = 'true';
      session = new UserSession();
      await session.initialize();

      request = (path: string) => session.testAgent.get(path);
    });

    it('should not block the request', async () => {
      const response = await request(pathEvent);

      expect(response.status).to.equal(200);
    });
  });

  describe('IS_SELF_HOSTED is false', () => {
    beforeEach(async () => {
      process.env.IS_SELF_HOSTED = 'false';
      session = new UserSession();
      await session.initialize();
      await session.updateOrganizationServiceLevel(ApiServiceLevelEnum.PRO);

      request = (path: string, authHeader = `ApiKey ${session.apiKey}`) =>
        session.testAgent.get(path).set('authorization', authHeader);
    });

    describe('Event resource blocking', () => {
      describe('Base Quota FF is enabled', () => {
        let getEventResourceUsageStub: sinon.SinonStub;

        beforeEach(() => {
          const getEventResourceUsage = session.testServer?.getService(GetEventResourceUsage) as GetEventResourceUsage;
          getEventResourceUsageStub = sinon.stub(getEventResourceUsage, 'execute');
        });

        afterEach(() => {
          getEventResourceUsageStub.reset();
        });

        it('should NOT block the request when the quota limit is NOT exceeded', async () => {
          getEventResourceUsageStub.resolves({
            remaining: 50,
            limit: 100,
            success: true,
            start: 1609459200000,
            reset: 1612137600000,
            apiServiceLevel: ApiServiceLevelEnum.FREE,
          });
          const response = await request(pathEvent);

          expect(response.status).to.equal(200);
        });

        it('should block the request when the quota limit is exceeded and product tier is free', async () => {
          await session.updateOrganizationServiceLevel(ApiServiceLevelEnum.FREE);
          getEventResourceUsageStub.resolves({
            remaining: 0,
            limit: 100,
            success: false,
            start: 1609459200000,
            reset: 1612137600000,
            apiServiceLevel: ApiServiceLevelEnum.FREE,
          });
          const response = await request(pathEvent);

          expect(response.status).to.equal(402);
        });

        it('should NOT block the request when the quota limit is exceeded and product tier is NOT free', async () => {
          getEventResourceUsageStub.resolves({
            remaining: 0,
            limit: 100,
            success: false,
            start: 1609459200000,
            reset: 1612137600000,
            apiServiceLevel: ApiServiceLevelEnum.BUSINESS,
          });
          const response = await request(pathEvent);

          expect(response.status).to.equal(200);
        });

        it('should NOT block the request when the evaluation lock is false', async () => {
          getEventResourceUsageStub.resolves({
            remaining: 0,
            limit: 0,
            success: true,
            start: 0,
            reset: 0,
            apiServiceLevel: ApiServiceLevelEnum.FREE,
            locked: false,
          });
          const response = await request(pathEvent);

          expect(response.status).to.equal(200);
        });
      });

      describe('Workflow run usage limits', () => {
        const organizationRepository = new CommunityOrganizationRepository();
        const pausingUsageLimits: IOrganizationUsageLimits = {
          workflowRuns: { headroom: 10_000, pauseAtLimit: true },
          alerts: { enabled: true, sendTo: UsageAlertRecipientsEnum.ADMINS },
        };
        let getSubscriptionStub: sinon.SinonStub;
        let restoreEnv: () => void;

        const expectNotEvaluated = (response: Awaited<ReturnType<typeof request>>) => {
          expect(response.status).to.equal(200);
          expect(response.headers).not.to.have.property('x-quotalimit-limit');
          expect(getSubscriptionStub.called).to.equal(false);
        };

        beforeEach(async () => {
          restoreEnv = overrideEnv({
            IS_EVENT_QUOTA_THROTTLER_ENABLED: 'true',
            [FeatureFlagsKeysEnum.IS_WORKFLOW_RUN_USAGE_LIMITS_ENABLED]: 'true',
          });
          await organizationRepository.updateUsageLimits(session.organization._id, pausingUsageLimits);

          const getSubscription = session.testServer?.getService(GetSubscription) as GetSubscription;
          getSubscriptionStub = sinon
            .stub(getSubscription, 'execute')
            .resolves(buildSubscription(ApiServiceLevelEnum.PRO, { current: 40_000, included: 30_000 }));
        });

        afterEach(() => {
          getSubscriptionStub.restore();
          restoreEnv();
        });

        for (const { apiServiceLevel, included } of [
          { apiServiceLevel: ApiServiceLevelEnum.PRO, included: 30_000 },
          { apiServiceLevel: ApiServiceLevelEnum.BUSINESS, included: 250_000 },
        ]) {
          it(`should block a ${apiServiceLevel} organization that reached its included events plus headroom`, async () => {
            await session.updateOrganizationServiceLevel(apiServiceLevel);
            getSubscriptionStub.resolves(buildSubscription(apiServiceLevel, { current: included + 10_000, included }));

            const response = await request(pathEvent);

            expect(response.status).to.equal(402);
            expect(response.body).to.deep.include({
              message: USAGE_LIMIT_PAUSED_EXCEPTION_MESSAGE,
              error: 'Payment required',
              status: 402,
            });
            expect(response.headers['x-quotalimit-limit']).to.equal(String(included + 10_000));
          });
        }

        it('should NOT block a pausing organization below its included events plus headroom', async () => {
          getSubscriptionStub.resolves(
            buildSubscription(ApiServiceLevelEnum.PRO, { current: 39_999, included: 30_000 })
          );

          const response = await request(pathEvent);

          expect(response.status).to.equal(200);
          expect(response.headers['x-quotalimit-limit']).to.equal('40000');
        });

        it('should resume workflow runs once the headroom is raised', async () => {
          const pausedResponse = await request(pathEvent);
          expect(pausedResponse.status).to.equal(402);

          await organizationRepository.updateUsageLimits(session.organization._id, {
            ...pausingUsageLimits,
            workflowRuns: { headroom: 20_000, pauseAtLimit: true },
          });
          const response = await request(pathEvent);

          expect(response.status).to.equal(200);
          expect(response.headers['x-quotalimit-limit']).to.equal('50000');
        });

        it('should NOT evaluate a paid organization that does not pause at its limit', async () => {
          await organizationRepository.updateUsageLimits(session.organization._id, {
            ...pausingUsageLimits,
            workflowRuns: { headroom: 10_000, pauseAtLimit: false },
          });

          expectNotEvaluated(await request(pathEvent));
        });

        it('should NOT evaluate a paid organization that pauses without a headroom', async () => {
          await organizationRepository.updateUsageLimits(session.organization._id, {
            ...pausingUsageLimits,
            workflowRuns: { headroom: null, pauseAtLimit: true },
          });

          expectNotEvaluated(await request(pathEvent));
        });

        it('should NOT evaluate a paid organization without usage limits', async () => {
          await organizationRepository.resetUsageLimits(session.organization._id);

          expectNotEvaluated(await request(pathEvent));
        });

        it('should NOT evaluate a pausing paid organization when usage limits are disabled', async () => {
          process.env[FeatureFlagsKeysEnum.IS_WORKFLOW_RUN_USAGE_LIMITS_ENABLED] = 'false';

          expectNotEvaluated(await request(pathEvent));
        });

        for (const apiServiceLevel of [ApiServiceLevelEnum.ENTERPRISE, ApiServiceLevelEnum.UNLIMITED]) {
          it(`should NOT evaluate an ${apiServiceLevel} organization with pause at limit settings`, async () => {
            await session.updateOrganizationServiceLevel(apiServiceLevel);
            getSubscriptionStub.resolves(buildSubscription(apiServiceLevel, { current: 40_000, included: 30_000 }));

            expectNotEvaluated(await request(pathEvent));
          });
        }

        it('should evaluate a Pro trial organization against its included events only', async () => {
          await organizationRepository.update({ _id: session.organization._id }, { isTrial: true });

          const response = await request(pathEvent);

          expect(response.status).to.equal(200);
          expect(response.headers['x-quotalimit-limit']).to.equal('30000');
        });

        it('should keep blocking a free organization at its included events regardless of the headroom', async () => {
          await session.updateOrganizationServiceLevel(ApiServiceLevelEnum.FREE);
          getSubscriptionStub.resolves(
            buildSubscription(ApiServiceLevelEnum.FREE, { current: 10_000, included: 10_000 })
          );

          const response = await request(pathEvent);

          expect(response.status).to.equal(402);
          expect(response.body.message).to.equal(THROTTLED_EXCEPTION_MESSAGE);
          expect(response.headers['x-quotalimit-limit']).to.equal('10000');
        });
      });
    });

    describe('Default resources (no decorator)', () => {
      it('should handle the request when the FF is enabled', async () => {
        process.env.IS_EVENT_QUOTA_THROTTLER_ENABLED = 'true';
        const response = await request(pathDefault);

        expect(response.status).to.equal(200);
      });

      it('should handle the request when the FF is disabled', async () => {
        process.env.IS_EVENT_QUOTA_THROTTLER_ENABLED = 'false';
        const response = await request(pathDefault);

        expect(response.status).to.equal(200);
      });
    });
  });
});

function buildSubscription(
  apiServiceLevel: ApiServiceLevelEnum,
  events: Pick<GetSubscriptionDto['events'], 'current' | 'included'>
): GetSubscriptionDto {
  return {
    apiServiceLevel,
    isActive: true,
    status: 'active',
    hasPaymentMethod: true,
    currentPeriodStart: '2024-04-05T00:00:00.000Z',
    currentPeriodEnd: '2024-05-05T00:00:00.000Z',
    billingInterval: 'month',
    events: { ...events, headroom: null, limit: null, isPaused: false, onDemandPricePer1k: null },
    usageLimits: null,
    trial: { isActive: false, start: null, end: null, daysTotal: 0 },
    cancelAt: null,
  };
}

function overrideEnv(values: Record<string, string>): () => void {
  const previousValues = Object.keys(values).map((key) => [key, process.env[key]] as const);
  Object.assign(process.env, values);

  return () => {
    for (const [key, value] of previousValues) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  };
}
