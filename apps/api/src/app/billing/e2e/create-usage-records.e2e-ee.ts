import { ApiServiceLevelEnum, FeatureFlagsKeysEnum, StripeBillingIntervalEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';

const { StripeUsageTypeEnum } = require('@novu/ee-billing/src/stripe/types');

interface UsecaseStub {
  execute: () => Promise<unknown>;
}

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

describe('CreateUsageRecords #novu-v2', () => {
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
  const loggerStub = {
    setContext: sinon.stub(),
    debug: sinon.stub(),
    info: sinon.stub(),
    error: sinon.stub(),
  };
  const featureFlagsServiceStub = {
    getFlag: sinon.stub(),
  };
  const workflowRunCountRepositoryStub = {
    getOrganizationUsageInExactRange: sinon.stub(),
  };
  const createSubscriptionUsecase: UsecaseStub = { execute: () => Promise.resolve() };
  const getOrCreateCustomerUsecase: UsecaseStub = { execute: () => Promise.resolve() };
  const getPlatformNotificationUsageUsecase: UsecaseStub = { execute: () => Promise.resolve() };
  let createUsageRecordStub: sinon.SinonStub;
  let getPlatformNotificationUsageStub: sinon.SinonStub;
  let createSubscriptionStub: sinon.SinonStub;
  let getOrCreateCustomerStub: sinon.SinonStub;

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
    ]);
    createSubscriptionStub = sinon.stub(createSubscriptionUsecase, 'execute').resolves({
      id: 'subscription_id',
    });
    getOrCreateCustomerStub = sinon.stub(getOrCreateCustomerUsecase, 'execute').resolves({
      id: 'customer_id',
      deleted: false,
      metadata: {
        organizationId: 'organization_id',
      },
      subscriptions: {
        data: [mockMonthlyBusinessSubscription],
      },
    });
    featureFlagsServiceStub.getFlag.resolves(false);
  });

  afterEach(() => {
    createUsageRecordStub.reset();
    getOrCreateCustomerStub.reset();
    createSubscriptionStub.reset();
    getPlatformNotificationUsageStub.reset();
    analyticsServiceStub.track.reset();
    loggerStub.setContext.reset();
    loggerStub.debug.reset();
    loggerStub.info.reset();
    loggerStub.error.reset();
    featureFlagsServiceStub.getFlag.reset();
    workflowRunCountRepositoryStub.getOrganizationUsageInExactRange.reset();
  });

  const createUseCase = () => {
    const useCase = new CreateUsageRecords(
      stripeStub,
      getOrCreateCustomerUsecase,
      createSubscriptionUsecase,
      getPlatformNotificationUsageUsecase,
      analyticsServiceStub,
      featureFlagsServiceStub,
      workflowRunCountRepositoryStub,
      loggerStub
    );

    return useCase;
  };

  const enableClickHouseUsage = () => {
    featureFlagsServiceStub.getFlag
      .withArgs(sinon.match({ key: FeatureFlagsKeysEnum.IS_BILLING_USAGE_CLICKHOUSE_ENABLED }))
      .resolves(true);
  };

  const givenSubscriptionPeriodStart = (periodStart: Date) => {
    getOrCreateCustomerStub.resolves({
      subscriptions: {
        data: [
          {
            ...mockMonthlyBusinessSubscription,
            current_period_start: periodStart.getTime() / 1000,
          },
        ],
      },
    });
  };

  it('should fetch the platform usage records with usage dates between the start and end date of the previous day', async () => {
    const mockDate = new Date('2021-01-15T00:01:00Z');
    const useCase = createUseCase();

    await useCase.execute(
      CreateUsageRecordsCommand.create({
        startDate: mockDate,
      })
    );

    const expectedStartDate = new Date('2021-01-14T00:00:00Z');
    const expectedEndDate = new Date('2021-01-14T23:59:59.999Z');

    expect(getPlatformNotificationUsageStub.lastCall.args).to.deep.equal([
      {
        startDate: expectedStartDate,
        endDate: expectedEndDate,
      },
    ]);
  });

  it('should create a free-tier subscription if the customer has no subscriptions', async () => {
    const mockNoSubscriptionsCustomer = {
      id: 'customer_id',
      subscriptions: { data: [] },
    };
    getOrCreateCustomerStub.resolves(mockNoSubscriptionsCustomer);
    const useCase = createUseCase();

    await useCase.execute(
      CreateUsageRecordsCommand.create({
        startDate: new Date(),
      })
    );

    expect(createSubscriptionStub.callCount).to.equal(1); // this is failing without the promise above
    expect(createSubscriptionStub.lastCall.args).to.deep.equal([
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
    getOrCreateCustomerStub.resolves({
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
    getOrCreateCustomerStub.resolves({
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

    const expectedTimestamp = new Date('2021-01-15T00:00:00Z').getTime() / 1000;

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
    getPlatformNotificationUsageStub.resolves([
      {
        _id: 'organization_id_1',
        apiServiceLevel: ApiServiceLevelEnum.FREE,
        notificationsCount: 100,
      },
    ]);
    const mockNoMeteredSubscription = {
      id: 'subscription_id',
      items: {
        data: [
          {
            id: 'item_id_flat',
            price: { lookup_key: 'business_flat_monthly', recurring: { usage_type: StripeUsageTypeEnum.LICENSED } },
          },
        ],
      },
    };
    getOrCreateCustomerStub.resolves({
      subscriptions: {
        data: [mockNoMeteredSubscription],
      },
    });
    const useCase = createUseCase();

    await useCase.execute(
      CreateUsageRecordsCommand.create({
        startDate: new Date(),
      })
    );

    expect(loggerStub.error.lastCall.args[0].err.message).to.equal(
      "No metered subscription found for organizationId: 'organization_id_1'"
    );
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

    const expectedUsageTimestamp = new Date('2021-01-15T00:00:00Z').getTime() / 1000;

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

  describe('when the period starts during the usage day', () => {
    const periodStart = new Date('2026-09-26T09:24:00Z');
    const cronRunDate = new Date('2026-09-26T10:05:00Z');

    beforeEach(() => {
      getPlatformNotificationUsageStub.resolves([
        {
          _id: 'organization_id',
          apiServiceLevel: ApiServiceLevelEnum.BUSINESS,
          notificationsCount: 1500,
        },
      ]);
      givenSubscriptionPeriodStart(periodStart);
    });

    it('should report only the runs since the period start when ClickHouse usage is enabled', async () => {
      enableClickHouseUsage();
      workflowRunCountRepositoryStub.getOrganizationUsageInExactRange.resolves(1000);

      await createUseCase().execute(CreateUsageRecordsCommand.create({ startDate: cronRunDate }));

      expect(workflowRunCountRepositoryStub.getOrganizationUsageInExactRange.lastCall.args).to.deep.equal([
        'organization_id',
        periodStart,
        new Date('2026-09-26T10:00:00Z'),
      ]);
      expect(createUsageRecordStub.lastCall.args).to.deep.equal([
        'item_id_usage_notifications',
        { quantity: 1000, timestamp: periodStart.getTime() / 1000, action: 'set' },
      ]);
      expect(analyticsServiceStub.track.lastCall.args[2].quantity).to.equal(1000);
    });

    it('should report the whole-day count when ClickHouse usage is disabled', async () => {
      await createUseCase().execute(CreateUsageRecordsCommand.create({ startDate: cronRunDate }));

      expect(workflowRunCountRepositoryStub.getOrganizationUsageInExactRange.called).to.equal(false);
      expect(createUsageRecordStub.lastCall.args).to.deep.equal([
        'item_id_usage_notifications',
        { quantity: 1500, timestamp: periodStart.getTime() / 1000, action: 'set' },
      ]);
    });
  });

  it('should skip the usage record when the whole usage day is before the period start and ClickHouse usage is enabled', async () => {
    enableClickHouseUsage();
    givenSubscriptionPeriodStart(new Date('2026-09-26T00:02:00Z'));

    await createUseCase().execute(CreateUsageRecordsCommand.create({ startDate: new Date('2026-09-26T00:05:00Z') }));

    expect(createUsageRecordStub.called).to.equal(false);
    expect(workflowRunCountRepositoryStub.getOrganizationUsageInExactRange.called).to.equal(false);
    expect(loggerStub.info.calledWithMatch({ organizationId: 'organization_id' })).to.equal(true);
  });

  it('should report the whole-day count when the period started before the usage day and ClickHouse usage is enabled', async () => {
    enableClickHouseUsage();
    givenSubscriptionPeriodStart(new Date('2026-09-01T09:24:00Z'));

    await createUseCase().execute(CreateUsageRecordsCommand.create({ startDate: new Date('2026-09-26T10:05:00Z') }));

    expect(workflowRunCountRepositoryStub.getOrganizationUsageInExactRange.called).to.equal(false);
    expect(createUsageRecordStub.lastCall.args).to.deep.equal([
      'item_id_usage_notifications',
      { quantity: 100, timestamp: new Date('2026-09-26T00:00:00Z').getTime() / 1000, action: 'set' },
    ]);
  });
});
