/* eslint-disable @typescript-eslint/naming-convention */
import { Logger } from '@nestjs/common';
import * as sinon from 'sinon';
import { expect } from 'chai';
import { ApiServiceLevelEnum } from '@novu/shared';
import { StripeBillingIntervalEnum, StripeUsageTypeEnum } from '@novu/ee-billing/src/stripe/types';

const mockMonthlyBusinessSubscription = {
  id: 'subscription_id',
  items: {
    data: [
      {
        id: 'item_id_usage_notifications',
        price: { lookup_key: 'business_usage_notifications', recurring: { usage_type: StripeUsageTypeEnum.METERED } },
      },
      {
        id: 'item_id_flat',
        price: { lookup_key: 'business_flat_monthly', recurring: { usage_type: StripeUsageTypeEnum.LICENSED } },
      },
    ],
  },
};

describe('CreateUsageRecords', () => {
  const eeBilling = require('@novu/ee-billing');
  if (!eeBilling) {
    throw new Error('ee-billing does not exist');
  }
  const { CreateUsageRecords, CreateUsageRecordsCommand } = eeBilling;

  const stripeStub = {
    subscriptionItems: {
      createUsageRecord: () => {},
    },
  };
  const analyticsServiceStub = {
    track: sinon.stub(),
  };
  const upsertSubscriptionUsecase = { execute: () => Promise.resolve() };
  const getCustomerUsecase = { execute: () => Promise.resolve() };
  const getPlatformNotificationUsageUsecase = { execute: () => Promise.resolve() };
  const getFeatureFlagUsecase = { execute: () => true };

  let createUsageRecordStub: sinon.SinonStub;
  const getOrganizationAdminUserStub = {
    execute: () => {
      return {
        _id: 'admin_user_id',
      };
    },
  };
  let getPlatformNotificationUsageStub: sinon.SinonStub;
  let getFeatureFlagStub: sinon.SinonStub;
  let upsertSubscriptionStub: sinon.SinonStub;
  let getCustomerStub: sinon.SinonStub;

  beforeEach(() => {
    createUsageRecordStub = sinon.stub(stripeStub.subscriptionItems, 'createUsageRecord').resolves({
      id: 'usage_record_id',
    });

    getPlatformNotificationUsageStub = sinon.stub(getPlatformNotificationUsageUsecase, 'execute').resolves([
      {
        _id: 'organization_id',
        apiServiceLevel: ApiServiceLevelEnum.BUSINESS,
        notificationsCount: 100,
      },
    ] as any);
    getFeatureFlagStub = sinon.stub(getFeatureFlagUsecase, 'execute').resolves(true);
    upsertSubscriptionStub = sinon.stub(upsertSubscriptionUsecase, 'execute').resolves({
      licensed: mockMonthlyBusinessSubscription,
      metered: mockMonthlyBusinessSubscription,
    } as any);
    getCustomerStub = sinon.stub(getCustomerUsecase, 'execute').resolves({
      id: 'customer_id',
      deleted: false,
      metadata: {
        organizationId: 'organization_id',
      },
      subscriptions: {
        data: [mockMonthlyBusinessSubscription],
      },
    } as any);
  });

  afterEach(() => {
    createUsageRecordStub.reset();
    getCustomerStub.reset();
    upsertSubscriptionStub.reset();
    getPlatformNotificationUsageStub.reset();
    getFeatureFlagStub.reset();
    analyticsServiceStub.track.reset();
  });

  const createUseCase = () => {
    const useCase = new CreateUsageRecords(
      stripeStub,
      getCustomerUsecase,
      upsertSubscriptionUsecase,
      getPlatformNotificationUsageUsecase,
      getFeatureFlagUsecase,
      analyticsServiceStub,
      getOrganizationAdminUserStub
    );

    return useCase;
  };

  it('should fetch the platform usage records with usage dates between the start and end date of the previous day', async () => {
    const mockDate = new Date('2021-01-15T12:00:00Z');
    const useCase = createUseCase();

    await useCase.execute(
      CreateUsageRecordsCommand.create({
        startDate: mockDate,
      })
    );

    const expectedStartDate = new Date('2021-01-14T00:00:00Z');
    const expectedEndDate = new Date('2021-01-15T00:00:00Z');

    expect(getPlatformNotificationUsageStub.lastCall.args).to.deep.equal([
      {
        startDate: expectedStartDate,
        endDate: expectedEndDate,
      },
    ]);
  });

  it('should not get the customer if the feature flag is disabled', async () => {
    getFeatureFlagStub.resolves(false);
    const useCase = createUseCase();

    await useCase.execute(
      CreateUsageRecordsCommand.create({
        startDate: new Date(),
      })
    );

    expect(getCustomerStub.callCount).to.equal(0);
  });

  it('should upsert a free-tier subscription if the customer has no subscriptions', async () => {
    const mockNoSubscriptionsCustomer = {
      id: 'customer_id',
      subscriptions: { data: [] },
    };
    getCustomerStub.resolves(mockNoSubscriptionsCustomer);
    const useCase = createUseCase();

    await useCase.execute(
      CreateUsageRecordsCommand.create({
        startDate: new Date(),
      })
    );

    expect(upsertSubscriptionStub.callCount).to.equal(1); // this is failing without the promise above
    expect(upsertSubscriptionStub.lastCall.args).to.deep.equal([
      {
        customer: mockNoSubscriptionsCustomer,
        apiServiceLevel: ApiServiceLevelEnum.FREE,
        billingInterval: StripeBillingIntervalEnum.MONTH,
      },
    ]);
  });

  it('should set the usage timestamp to the subscription current period start if the subscription is new', async () => {
    const mockSubscriptionStartDate = new Date('2021-02-01T00:00:00Z');
    const mockSubscriptionCurrentPeriodStart = mockSubscriptionStartDate.getTime() / 1000;
    const mockUsageStartDate = new Date('2021-01-15T00:00:00Z');
    getCustomerStub.resolves({
      subscriptions: {
        data: [
          {
            ...mockMonthlyBusinessSubscription,
            current_period_start: mockSubscriptionCurrentPeriodStart,
          },
        ],
      },
    });
    const useCase = createUseCase();

    await useCase.execute(
      CreateUsageRecordsCommand.create({
        startDate: mockUsageStartDate,
      })
    );

    expect(createUsageRecordStub.lastCall.args[1].timestamp).to.equal(mockSubscriptionCurrentPeriodStart);
  });

  it('should set the usage timestamp to the usage start date if the subscription is not new', async () => {
    const mockSubscriptionStartDate = new Date('2021-01-01T00:00:00Z');
    const mockSubscriptionCreated = mockSubscriptionStartDate.getTime() / 1000;
    const mockCurrentDate = new Date('2021-01-15T12:00:00Z');
    getCustomerStub.resolves({
      subscriptions: {
        data: [
          {
            ...mockMonthlyBusinessSubscription,
            current_period_start: mockSubscriptionCreated,
          },
        ],
      },
    });
    const useCase = createUseCase();

    const expectedTimestamp = new Date('2021-01-14T00:00:00Z').getTime() / 1000;

    await useCase.execute(
      CreateUsageRecordsCommand.create({
        startDate: mockCurrentDate,
      })
    );

    expect(createUsageRecordStub.lastCall.args[1].timestamp).to.equal(expectedTimestamp);
  });

  it('should use the usage subscription item to create the usage record', async () => {
    const useCase = createUseCase();

    await useCase.execute(
      CreateUsageRecordsCommand.create({
        startDate: new Date(),
      })
    );

    expect(createUsageRecordStub.lastCall.args[0]).to.equal('item_id_usage_notifications');
  });

  it('should log an error if the usage subscription item is not found on the subscription', async () => {
    const logStub = sinon.spy(Logger, 'error');
    getPlatformNotificationUsageStub.resolves([
      {
        _id: 'organization_id_1',
        apiServiceLevel: ApiServiceLevelEnum.FREE,
        notificationsCount: 100,
      },
    ]);
    const useCase = createUseCase();

    await useCase.execute(
      CreateUsageRecordsCommand.create({
        startDate: new Date(),
      })
    );

    expect(logStub.lastCall.args[0].message).to.equal(
      "Subscription item not found for subscriptionId: 'subscription_id' and price lookup key: 'free_usage_notifications'"
    );

    logStub.restore();
  });

  it('should create a usage record for each organization', async () => {
    const mockUsageStartDate = new Date('2021-01-15T12:00:00Z');
    getPlatformNotificationUsageStub.resolves([
      {
        _id: 'organization_id_1',
        apiServiceLevel: ApiServiceLevelEnum.BUSINESS,
        notificationsCount: 100,
      },
      {
        _id: 'organization_id_2',
        apiServiceLevel: ApiServiceLevelEnum.BUSINESS,
        notificationsCount: 200,
      },
    ]);
    const useCase = createUseCase();

    await useCase.execute(
      CreateUsageRecordsCommand.create({
        startDate: mockUsageStartDate,
      })
    );

    const expectedUsageTimestamp = new Date('2021-01-14T00:00:00Z').getTime() / 1000;

    expect(createUsageRecordStub.getCalls().map(({ args }) => args)).to.deep.equal([
      [
        'item_id_usage_notifications',
        {
          quantity: 100,
          timestamp: expectedUsageTimestamp,
          action: 'set',
        },
      ],
      [
        'item_id_usage_notifications',
        {
          quantity: 200,
          timestamp: expectedUsageTimestamp,
          action: 'set',
        },
      ],
    ]);
  });
});
