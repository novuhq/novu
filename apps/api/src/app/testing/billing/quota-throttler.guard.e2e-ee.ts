import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import { ApiServiceLevelEnum } from '@novu/shared';
import { GetEventResourceUsage } from '@novu/ee-billing';

process.env.LAUNCH_DARKLY_SDK_KEY = ''; // disable Launch Darkly to allow test to define FF state

describe('Resource Limiting', () => {
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

      request = (path: string, authHeader = `ApiKey ${session.apiKey}`) =>
        session.testAgent.get(path).set('authorization', authHeader);
    });

    describe('Event resource blocking', () => {
      describe('Event Quota FF is enabled', () => {
        beforeEach(() => {
          process.env.IS_EVENT_QUOTA_LIMITING_ENABLED = 'true';
        });

        it('should block the request', async () => {
          const response = await request(pathEvent);

          expect(response.status).to.equal(402);
          expect(response.body.status).to.equal(402);
          expect(response.body.error).to.equal('Payment required');
          expect(response.body.message).to.match(
            /You have exceeded the number of allowed requests for this resource\. Please visit http.+ to upgrade your subscription./
          );
        });
      });

      describe('Event Quota FF is disabled', () => {
        beforeEach(() => {
          process.env.IS_EVENT_QUOTA_LIMITING_ENABLED = 'false';
        });

        describe('Base Quota FF is enabled', () => {
          let getEventResourceUsageStub: sinon.SinonStub;

          beforeEach(() => {
            process.env.IS_QUOTA_LIMITING_ENABLED = 'true';

            const getEventResourceUsage = session.testServer?.getService(
              GetEventResourceUsage
            ) as GetEventResourceUsage;
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
              locked: true,
            });
            const response = await request(pathEvent);

            expect(response.status).to.equal(200);
          });

          it('should block the request when the quota limit is exceeded and product tier is free', async () => {
            getEventResourceUsageStub.resolves({
              remaining: 0,
              limit: 100,
              success: false,
              start: 1609459200000,
              reset: 1612137600000,
              apiServiceLevel: ApiServiceLevelEnum.FREE,
              locked: true,
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
              locked: true,
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

          it('should set the quota limit headers when the evaluation lock is true', async () => {
            getEventResourceUsageStub.resolves({
              remaining: 0,
              limit: 100,
              success: false,
              start: 1609459200000,
              reset: 1612137600000,
              apiServiceLevel: ApiServiceLevelEnum.BUSINESS,
              locked: true,
            });
            const response = await request(pathEvent);

            expect(response.headers['x-quotalimit-limit']).to.eq('100');
            expect(response.headers['x-quotalimit-remaining']).to.eq('0');
            expect(response.headers['x-quotalimit-reset']).to.eq('0');
            expect(response.headers['x-quotalimit-policy']).to.eq(
              '100;w=2678400;resource="events";serviceLevel="business"'
            );
          });

          it('should NOT set the quota limit headers when the evaluation lock is false', async () => {
            getEventResourceUsageStub.resolves({
              remaining: 0,
              limit: 100,
              success: false,
              start: 1609459200000,
              reset: 1612137600000,
              apiServiceLevel: ApiServiceLevelEnum.BUSINESS,
              locked: false,
            });
            const response = await request(pathEvent);

            expect(response.headers['x-quotalimit-limit']).to.be.undefined;
            expect(response.headers['x-quotalimit-remaining']).to.be.undefined;
            expect(response.headers['x-quotalimit-reset']).to.be.undefined;
            expect(response.headers['x-quotalimit-policy']).to.be.undefined;
          });
        });

        describe('Base Quota FF is disabled', () => {
          beforeEach(() => {
            process.env.IS_QUOTA_LIMITING_ENABLED = 'false';
          });

          it('should NOT block the request', async () => {
            const response = await request(pathEvent);

            expect(response.status).to.equal(200);
          });
        });
      });
    });

    describe('Default resources (no decorator)', () => {
      it('should handle the request when the FF is enabled', async () => {
        process.env.IS_EVENT_QUOTA_LIMITING_ENABLED = 'true';
        const response = await request(pathDefault);

        expect(response.status).to.equal(200);
      });

      it('should handle the request when the FF is disabled', async () => {
        process.env.IS_EVENT_QUOTA_LIMITING_ENABLED = 'false';
        const response = await request(pathDefault);

        expect(response.status).to.equal(200);
      });
    });
  });
});
