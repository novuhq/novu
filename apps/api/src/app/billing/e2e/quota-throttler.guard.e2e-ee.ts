import { CommunityOrganizationRepository } from '@novu/dal';
import {
  GetEventResourceUsage,
  GetOrganizationPeriodUsage,
  GetStripeSubscription,
  usageLimitPausedExceptionMessage,
} from '@novu/ee-billing';
import { ApiServiceLevelEnum, FeatureFlagsKeysEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import { buildStripeSubscription, PAUSING_USAGE_LIMITS, useEnvironment } from './billing-e2e.helpers';

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

        useEnvironment({
          IS_EVENT_QUOTA_THROTTLER_ENABLED: 'true',
          [FeatureFlagsKeysEnum.IS_WORKFLOW_RUN_USAGE_LIMITS_ENABLED]: 'true',
        });

        beforeEach(async () => {
          await organizationRepository.updateUsageLimits(session.organization._id, PAUSING_USAGE_LIMITS);

          // BillingModule is imported by more than one module, so every instance must see the stubs.
          sinon.stub(GetStripeSubscription.prototype, 'execute').resolves(buildStripeSubscription(30_000));
          sinon.stub(GetOrganizationPeriodUsage.prototype, 'execute').resolves({ notificationsCount: 40_000 });
        });

        it('should block a pausing Pro organization that reached its included events plus on-demand limit', async () => {
          const response = await request(pathEvent);

          expect(response.status).to.equal(402);
          expect(response.body).to.deep.include({
            message: usageLimitPausedExceptionMessage(),
            error: 'Payment required',
            status: 402,
          });
          expect(response.headers['x-quotalimit-limit']).to.equal('40000');
        });

        it('should resume workflow runs once the stored on-demand limit is raised', async () => {
          expect((await request(pathEvent)).status).to.equal(402);

          await organizationRepository.updateUsageLimits(session.organization._id, {
            ...PAUSING_USAGE_LIMITS,
            workflowRuns: { onDemandLimit: 20_000, pauseAtLimit: true },
          });
          const response = await request(pathEvent);

          expect(response.status).to.equal(200);
          expect(response.headers['x-quotalimit-limit']).to.equal('50000');
        });

        it('should NOT evaluate a pausing Pro organization when usage limits are disabled', async () => {
          process.env[FeatureFlagsKeysEnum.IS_WORKFLOW_RUN_USAGE_LIMITS_ENABLED] = 'false';

          const response = await request(pathEvent);

          expect(response.status).to.equal(200);
          expect(response.headers).not.to.have.property('x-quotalimit-limit');
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
