import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import { ApiServiceLevelEnum } from '@novu/shared';
import { GetEventResourceUsage } from '@novu/ee-billing';
import { OrganizationRepository } from '@novu/dal';

// Mock interfaces and types (if not already defined)
class MockOrganization {
  _id: string;
  name: string;
  apiServiceLevel: ApiServiceLevelEnum;
  createdAt: 'ApiServiceLevelEnum';
  updatedAt: 'ApiServiceLevelEnum';
}

/*
 * Disable Launch Darkly to allow test to define feature flag state
 * @ts-ignore
 */
// @ts-ignore
process.env.LAUNCH_DARKLY_SDK_KEY = '';

describe('Resource Limiting #novu-v2', () => {
  let session: UserSession;
  const pathDefault = '/v1/testing/resource-limiting-default';
  const pathEvent = '/v1/testing/resource-limiting-events';

  // Type-safe request function
  let request: (
    path: string,
    authHeader?: string
  ) => Promise<Awaited<ReturnType<typeof UserSession.prototype.testAgent.get>>>;

  // Stub for Organization Repository
  let organizationRepositoryStub: sinon.SinonStubbedInstance<OrganizationRepository>;
  // Reusable mock organization data
  const createMockOrganization = (serviceLevel: ApiServiceLevelEnum = ApiServiceLevelEnum.FREE): MockOrganization => ({
    _id: 'mock-org-id',
    name: 'Test Organization',
    apiServiceLevel: serviceLevel,
    createdAt: 'ApiServiceLevelEnum',
    updatedAt: 'ApiServiceLevelEnum',
  });

  describe('IS_SELF_HOSTED is false', () => {
    beforeEach(async () => {
      // Set environment to non-self-hosted
      process.env.IS_SELF_HOSTED = 'false';

      // Initialize user session
      session = new UserSession();
      await session.initialize();

      // Create stub for Organization Repository
      organizationRepositoryStub = sinon.createStubInstance(OrganizationRepository);

      // Configure default organization stub
      organizationRepositoryStub.findById.resolves(createMockOrganization(ApiServiceLevelEnum.FREE));

      // Configure request method
      request = (path: string, authHeader = `ApiKey ${session.apiKey}`) =>
        session.testAgent.get(path).set('authorization', authHeader);
    });

    afterEach(() => {
      // Restore all stubs
      sinon.restore();
    });

    describe('Event Resource Blocking', () => {
      describe('Base Quota Feature Flag is Enabled', () => {
        let getEventResourceUsageStub: sinon.SinonStub;

        beforeEach(() => {
          // Stub the GetEventResourceUsage service
          const getEventResourceUsage = session.testServer?.getService(GetEventResourceUsage) as GetEventResourceUsage;

          getEventResourceUsageStub = sinon.stub(getEventResourceUsage, 'execute');
        });

        afterEach(() => {
          // Reset the stub after each test
          getEventResourceUsageStub.reset();
        });

        it('should NOT block request when quota is not exceeded', async () => {
          // Configure stub for non-exceeded quota
          getEventResourceUsageStub.resolves({
            remaining: 50,
            limit: 100,
            success: true,
            start: 1609459200000,
            reset: 1612137600000,
            apiServiceLevel: ApiServiceLevelEnum.FREE,
          });

          // Perform request
          const response = await request(pathEvent);

          // Assert response
          expect(response.status).to.equal(200);
        });

        it('should block request when quota is exceeded for FREE tier', async () => {
          // Configure stub for exceeded quota in FREE tier
          organizationRepositoryStub.findById.resolves(createMockOrganization(ApiServiceLevelEnum.FREE));

          getEventResourceUsageStub.resolves({
            remaining: 0,
            limit: 100,
            success: false,
            start: 1609459200000,
            reset: 1612137600000,
            apiServiceLevel: ApiServiceLevelEnum.FREE,
          });

          // Perform request
          const response = await request(pathEvent);

          // Assert response
          expect(response.status).to.equal(402);
        });

        it('should NOT block request when quota is exceeded for BUSINESS tier', async () => {
          organizationRepositoryStub.findById.resolves(createMockOrganization(ApiServiceLevelEnum.BUSINESS));

          // Configure stub for exceeded quota in BUSINESS tier
          getEventResourceUsageStub.resolves({
            remaining: 0,
            limit: 100,
            success: false,
            start: 1609459200000,
            reset: 1612137600000,
            apiServiceLevel: ApiServiceLevelEnum.BUSINESS,
          });

          // Perform request
          const response = await request(pathEvent);

          // Assert response
          expect(response.status).to.equal(200);
        });

        it('should NOT block request when evaluation lock is false', async () => {
          // Configure stub with unlocked scenario
          getEventResourceUsageStub.resolves({
            remaining: 0,
            limit: 0,
            success: true,
            start: 0,
            reset: 0,
            apiServiceLevel: ApiServiceLevelEnum.FREE,
            locked: false,
          });

          // Perform request
          const response = await request(pathEvent);

          // Assert response
          expect(response.status).to.equal(200);
        });
      });
    });

    describe('Default Resources (No Decorator)', () => {
      it('should handle request when feature flag is enabled', async () => {
        /*
         * Enable event quota throttler
         * @ts-ignore
         */
        // @ts-ignore
        process.env.IS_EVENT_QUOTA_THROTTLER_ENABLED = 'true';

        // Perform request
        const response = await request(pathDefault);

        // Assert response
        expect(response.status).to.equal(200);
      });

      it('should handle request when feature flag is disabled', async () => {
        /*
         * Disable event quota throttler
         * @ts-ignore
         */
        // @ts-ignore
        process.env.IS_EVENT_QUOTA_THROTTLER_ENABLED = 'false';

        // Perform request
        const response = await request(pathDefault);

        // Assert response
        expect(response.status).to.equal(200);
      });
    });
  });

  describe('IS_SELF_HOSTED is true', () => {
    beforeEach(async () => {
      // Set environment to self-hosted
      process.env.IS_SELF_HOSTED = 'true';

      // Initialize user session
      session = new UserSession();
      await session.initialize();

      // Configure request method for self-hosted
      request = (path: string) => session.testAgent.get(path);
    });

    it('should not block the request in self-hosted mode', async () => {
      // Perform request
      const response = await request(pathEvent);

      // Assert response
      expect(response.status).to.equal(200);
    });
  });
});
