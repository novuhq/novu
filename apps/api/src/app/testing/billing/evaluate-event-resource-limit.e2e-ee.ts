import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { Test } from '@nestjs/testing';
import { CacheService, MockCacheService } from '@novu/application-generic';
import { SharedModule } from '../../shared/shared.module';
import { ApiServiceLevelEnum } from '@novu/shared';
import {
  EvaluateEventResourceLimit,
  GetPlatformNotificationUsage,
  GetSubscription,
  BillingModule,
} from '@novu/ee-billing';
import { randomUUID } from 'node:crypto';

describe('EvaluateEventResourceLimit', async () => {
  let useCase: EvaluateEventResourceLimit;
  let session: UserSession;
  let getSubscription: GetSubscription;
  let getPlatformNotificationUsage: GetPlatformNotificationUsage;

  let getSubscriptionStub: sinon.SinonStub;
  let getPlatformNotificationUsageStub: sinon.SinonStub;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SharedModule, BillingModule.forRoot()],
    })
      .overrideProvider(CacheService)
      .useValue(MockCacheService.createClient())
      .compile();

    session = new UserSession();
    await session.initialize();

    useCase = moduleRef.get(EvaluateEventResourceLimit);
    getSubscription = moduleRef.get<GetSubscription>(GetSubscription);
    getPlatformNotificationUsage = moduleRef.get(GetPlatformNotificationUsage);

    getSubscriptionStub = sinon.stub(getSubscription, 'execute').resolves({
      currentPeriodStart: new Date('2021-01-01').toISOString(),
      currentPeriodEnd: new Date('2021-02-01').toISOString(),
      hasPaymentMethod: true,
      status: 'trialing',
      trialEnd: null,
      trialStart: null,
      includedEvents: 100,
    });
    getPlatformNotificationUsageStub = sinon
      .stub(getPlatformNotificationUsage, 'execute')
      .resolves([{ _id: '1', notificationsCount: 50, apiServiceLevel: ApiServiceLevelEnum.BUSINESS }]);
  });

  afterEach(() => {
    getSubscriptionStub.restore();
    getPlatformNotificationUsageStub.restore();
  });

  describe('within the maximum evaluation duration', () => {
    it('should return a successful evaluation when events are within the limit', async () => {
      const result = await useCase.execute({
        organizationId: 'organization_id',
        environmentId: 'environment_id',
        userId: 'user_id',
      });

      expect(result).to.deep.equal({
        remaining: 50,
        limit: 100,
        success: true,
        start: 1609459200000,
        reset: 1612137600000,
        apiServiceLevel: ApiServiceLevelEnum.BUSINESS,
        locked: true,
      });
    });

    it('should return a failed evaluation when events are above the limit', async () => {
      getPlatformNotificationUsageStub.resolves([
        { _id: '1', notificationsCount: 100, apiServiceLevel: ApiServiceLevelEnum.BUSINESS },
      ]);

      const result = await useCase.execute({
        organizationId: 'organization_id',
        environmentId: 'environment_id',
        userId: 'user_id',
      });

      expect(result).to.deep.equal({
        remaining: 0,
        limit: 100,
        success: false,
        start: 1609459200000,
        reset: 1612137600000,
        apiServiceLevel: ApiServiceLevelEnum.BUSINESS,
        locked: true,
      });
    });

    it('should return a count of 0 notifications and free api service level when no events are recorded', async () => {
      getPlatformNotificationUsageStub.resolves([]);

      const result = await useCase.execute({
        organizationId: 'organization_id',
        environmentId: 'environment_id',
        userId: 'user_id',
      });

      expect(result).to.deep.equal({
        remaining: 100,
        limit: 100,
        success: true,
        start: 1609459200000,
        reset: 1612137600000,
        apiServiceLevel: ApiServiceLevelEnum.FREE,
        locked: true,
      });
    });

    it('should fetch usage with the subscription period dates and organizationId', async () => {
      await useCase.execute({
        organizationId: 'organization_id',
        environmentId: 'environment_id',
        userId: 'user_id',
      });

      expect(getPlatformNotificationUsageStub.lastCall.args[0]).to.deep.equal({
        organizationId: 'organization_id',
        startDate: new Date('2021-01-01'),
        endDate: new Date('2021-02-01'),
      });
    });
  });

  describe('fallback evaluation', () => {
    it('should return the fallback evaluation when the usage evaluation takes longer than the maximum evaluation duration', async () => {
      getPlatformNotificationUsageStub.resolves(
        new Promise((resolve) =>
          setTimeout(async () => {
            resolve([{ _id: '1', notificationsCount: 50, apiServiceLevel: ApiServiceLevelEnum.BUSINESS }]);
          }, 1000)
        )
      );

      const result = await useCase.execute({
        organizationId: randomUUID(),
        environmentId: 'environment_id',
        userId: 'user_id',
      });

      expect(result).to.deep.equal({
        remaining: 0,
        limit: 0,
        success: true,
        reset: 0,
        start: 0,
        apiServiceLevel: ApiServiceLevelEnum.FREE,
        locked: false,
      });
    });

    it('should return the fallback evaluation when the subscription has no included events', async () => {
      getSubscriptionStub.resolves({
        currentPeriodStart: new Date('2021-01-01').toISOString(),
        currentPeriodEnd: new Date('2021-02-01').toISOString(),
        hasPaymentMethod: true,
        status: 'trialing',
        trialEnd: null,
        trialStart: null,
        includedEvents: null,
      });

      const result = await useCase.execute({
        organizationId: randomUUID(),
        environmentId: 'environment_id',
        userId: 'user_id',
      });

      expect(result).to.deep.equal({
        remaining: 0,
        limit: 0,
        success: true,
        reset: 0,
        start: 0,
        apiServiceLevel: ApiServiceLevelEnum.FREE,
        locked: false,
      });
    });
  });
});
