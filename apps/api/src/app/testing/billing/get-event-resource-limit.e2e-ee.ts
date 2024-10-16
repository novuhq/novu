import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import { Test } from '@nestjs/testing';
import { CacheService, MockCacheService } from '@novu/application-generic';
import { ApiServiceLevelEnum, GetSubscriptionDto } from '@novu/shared';
import { GetEventResourceUsage, GetPlatformNotificationUsage, GetSubscription } from '@novu/ee-billing';
import { randomUUID } from 'node:crypto';
import { AppModule } from '../../../app.module';

describe('GetEventResourceUsage', async () => {
  let useCase: GetEventResourceUsage;
  let session: UserSession;
  let getSubscription: GetSubscription;

  let getSubscriptionStub: sinon.SinonStub;

  const getSubscriptionResponse: GetSubscriptionDto = {
    apiServiceLevel: ApiServiceLevelEnum.BUSINESS,
    isActive: true,
    status: 'trialing',
    hasPaymentMethod: false,
    currentPeriodStart: new Date('2021-01-01').toISOString(),
    currentPeriodEnd: new Date('2021-02-01').toISOString(),
    billingInterval: 'month',
    events: {
      current: 50,
      included: 100,
    },
    trial: {
      start: null,
      end: null,
      isActive: true,
      daysTotal: 0,
    },
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(CacheService)
      .useValue(MockCacheService.createClient())
      .compile();

    session = new UserSession();
    await session.initialize();

    useCase = moduleRef.get(GetEventResourceUsage);
    getSubscription = moduleRef.get<GetSubscription>(GetSubscription);
    getSubscriptionStub = sinon.stub(getSubscription, 'execute').resolves(getSubscriptionResponse);
  });

  afterEach(() => {
    getSubscriptionStub.restore();
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
      getSubscriptionStub.resolves({
        ...getSubscriptionResponse,
        events: {
          current: 100,
          included: 100,
        },
      });

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
  });

  describe('fallback evaluation', () => {
    it('should return the fallback evaluation when the usage evaluation takes longer than the maximum evaluation duration', async () => {
      getSubscriptionStub.resolves(
        new Promise((resolve) => {
          setTimeout(async () => {
            resolve(getSubscriptionResponse);
          }, 1000);
        })
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
        ...getSubscriptionResponse,
        events: {
          current: 100,
          included: null,
        },
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
