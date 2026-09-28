import { CommunityOrganizationRepository } from '@novu/dal';
import { ApiServiceLevelEnum, IOrganizationUsageLimits, UsageAlertRecipientsEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import { Stripe } from 'stripe';

type DeepPartial<T> = T extends object ? { [P in keyof T]?: DeepPartial<T[P]> } : T;

const buildStripeSubscriptionItems = (
  includedEvents: string
): DeepPartial<Stripe.ApiList<Stripe.SubscriptionItem>> => ({
  data: [
    {
      price: {
        recurring: {
          usage_type: 'licensed',
          interval: 'month',
        },
        metadata: {
          includedEvents,
        },
      },
    },
    {
      price: {
        recurring: {
          usage_type: 'metered',
          interval: 'month',
        },
        metadata: {
          includedEvents,
        },
      },
    },
  ],
});

const buildStripeCustomer = (includedEvents = '1000000'): DeepPartial<Stripe.Customer> => ({
  id: 'customer_id',
  invoice_settings: {
    default_payment_method: 'payment_method_id',
  },
  subscriptions: {
    data: [
      {
        id: 'subscription_id',
        status: 'active',
        current_period_end: new Date('2024-05-05T00:00:00.000Z').getTime() / 1000,
        current_period_start: new Date('2024-04-05T00:00:00.000Z').getTime() / 1000,
        trial_start: null,
        trial_end: null,
        items: buildStripeSubscriptionItems(includedEvents),
      },
    ],
  },
});

describe('GetSubscription #novu-v2', async () => {
  let session: UserSession;

  const eeBilling = require('@novu/ee-billing');
  if (!eeBilling) {
    throw new Error('ee-billing does not exist');
  }

  const { GetOrganizationPeriodUsageCommand, GetStripeSubscription, GetSubscription, GetSubscriptionCommand } =
    eeBilling;

  const communityOrganizationRepository = new CommunityOrganizationRepository();
  let notificationsCount: number;
  const getOrganizationPeriodUsage = {
    execute: () => Promise.resolve({ notificationsCount }),
  };
  let getOrCreateCustomer: { execute: () => Promise<DeepPartial<Stripe.Customer>> };
  let isUsageLimitsEnabled: boolean;
  const featureFlagsService = {
    getFlag: async () => isUsageLimitsEnabled,
  };
  let getOrganizationPeriodUsageSpy: sinon.SinonSpy;

  const executeUseCase = () =>
    new GetSubscription(
      new GetStripeSubscription(getOrCreateCustomer),
      getOrganizationPeriodUsage,
      communityOrganizationRepository,
      featureFlagsService
    ).execute(
      GetSubscriptionCommand.create({
        organizationId: session.organization._id,
      })
    );

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    await session.updateOrganizationServiceLevel(ApiServiceLevelEnum.BUSINESS);
    notificationsCount = 1000000;
    isUsageLimitsEnabled = false;
    getOrCreateCustomer = {
      execute: () => Promise.resolve(buildStripeCustomer()),
    };
    getOrganizationPeriodUsageSpy = sinon.spy(getOrganizationPeriodUsage, 'execute');
  });

  afterEach(() => {
    getOrganizationPeriodUsageSpy.restore();
  });

  it('should return the correct subscription details for a given organization', async () => {
    const result = await executeUseCase();

    expect(result).to.deep.equal({
      apiServiceLevel: ApiServiceLevelEnum.BUSINESS,
      isActive: true,
      status: 'active',
      hasPaymentMethod: true,
      currentPeriodStart: '2024-04-05T00:00:00.000Z',
      currentPeriodEnd: '2024-05-05T00:00:00.000Z',
      billingInterval: 'month',
      events: {
        current: 1000000,
        included: 1000000,
        headroom: null,
        limit: null,
        isPaused: false,
        onDemandPricePer1k: null,
      },
      usageLimits: null,
      trial: {
        start: null,
        end: null,
        isActive: false,
        daysTotal: 0,
      },
      cancelAt: null,
    });
  });

  it('should fetch usage with the subscription period dates and organizationId', async () => {
    await executeUseCase();

    expect(getOrganizationPeriodUsageSpy.lastCall.args.at(0)).to.deep.equal(
      GetOrganizationPeriodUsageCommand.create({
        organizationId: session.organization._id,
        startDate: new Date('2024-04-05T00:00:00.000Z'),
        endDate: new Date('2024-05-05T00:00:00.000Z'),
      })
    );
  });

  it('should throw error if no licensed subscription is found', async () => {
    const stripeCustomer = buildStripeCustomer();
    getOrCreateCustomer = {
      execute: () =>
        Promise.resolve({
          ...stripeCustomer,
          subscriptions: {
            data: [
              {
                ...stripeCustomer.subscriptions?.data?.[0],
                items: {
                  data: [
                    {
                      price: {
                        recurring: {
                          usage_type: 'metered',
                          interval: 'month',
                        },
                        metadata: {
                          includedEvents: '1000000',
                        },
                      },
                    },
                  ],
                },
              },
            ],
          },
        }),
    };

    try {
      await executeUseCase();
      // shouldn't get here
      throw new Error();
    } catch (e) {
      expect(e.message).to.include("No licensed subscription found for customerId: 'customer_id'");
    }
  });

  it('should throw error if no metered subscription is found', async () => {
    const stripeCustomer = buildStripeCustomer();
    getOrCreateCustomer = {
      execute: () =>
        Promise.resolve({
          ...stripeCustomer,
          subscriptions: {
            data: [
              {
                ...stripeCustomer.subscriptions?.data?.[0],
                items: {
                  data: [
                    {
                      price: {
                        recurring: {
                          usage_type: 'licensed',
                          interval: 'month',
                        },
                        metadata: {
                          includedEvents: '1000000',
                        },
                      },
                    },
                  ],
                },
              },
            ],
          },
        }),
    };

    try {
      await executeUseCase();
      // shouldn't get here
      throw new Error();
    } catch (e) {
      expect(e.message).to.include("No metered subscription found for customerId: 'customer_id'");
    }
  });

  describe('workflow run usage limits', () => {
    const pausingUsageLimits: IOrganizationUsageLimits = {
      workflowRuns: { headroom: 10_000, pauseAtLimit: true },
      alerts: { enabled: false, sendTo: UsageAlertRecipientsEnum.ALL_MEMBERS },
    };
    const defaultAlerts = { enabled: true, sendTo: UsageAlertRecipientsEnum.ADMINS };

    const givenOrganization = async ({
      apiServiceLevel,
      isTrial = false,
      includedEvents,
      usageLimits,
    }: {
      apiServiceLevel: ApiServiceLevelEnum;
      isTrial?: boolean;
      includedEvents: number;
      usageLimits?: IOrganizationUsageLimits;
    }) => {
      await communityOrganizationRepository.update({ _id: session.organization._id }, { apiServiceLevel, isTrial });
      if (usageLimits) {
        await communityOrganizationRepository.updateUsageLimits(session.organization._id, usageLimits);
      }
      getOrCreateCustomer = {
        execute: () => Promise.resolve(buildStripeCustomer(String(includedEvents))),
      };
    };

    beforeEach(() => {
      isUsageLimitsEnabled = true;
    });

    it('should report the limit and a paused state for a Pro organization at its included events plus headroom', async () => {
      await givenOrganization({
        apiServiceLevel: ApiServiceLevelEnum.PRO,
        includedEvents: 30_000,
        usageLimits: pausingUsageLimits,
      });
      notificationsCount = 40_000;

      const { events, usageLimits } = await executeUseCase();

      expect(events).to.deep.equal({
        current: 40_000,
        included: 30_000,
        headroom: 10_000,
        limit: 40_000,
        isPaused: true,
        onDemandPricePer1k: 1.2,
      });
      expect(usageLimits).to.deep.equal({
        isConfigurable: true,
        pauseAtLimit: true,
        alerts: { enabled: false, sendTo: UsageAlertRecipientsEnum.ALL_MEMBERS },
      });
    });

    it('should not report a paused state for a Pro organization below its included events plus headroom', async () => {
      await givenOrganization({
        apiServiceLevel: ApiServiceLevelEnum.PRO,
        includedEvents: 30_000,
        usageLimits: pausingUsageLimits,
      });
      notificationsCount = 39_999;

      const { events } = await executeUseCase();

      expect(events).to.deep.equal({
        current: 39_999,
        included: 30_000,
        headroom: 10_000,
        limit: 40_000,
        isPaused: false,
        onDemandPricePer1k: 1.2,
      });
    });

    it('should report the limit without pausing a Business organization that does not pause at its limit', async () => {
      await givenOrganization({
        apiServiceLevel: ApiServiceLevelEnum.BUSINESS,
        includedEvents: 250_000,
        usageLimits: { workflowRuns: { headroom: 10_000, pauseAtLimit: false } },
      });
      notificationsCount = 300_000;

      const { events, usageLimits } = await executeUseCase();

      expect(events).to.deep.equal({
        current: 300_000,
        included: 250_000,
        headroom: 10_000,
        limit: 260_000,
        isPaused: false,
        onDemandPricePer1k: 1.2,
      });
      expect(usageLimits).to.deep.equal({ isConfigurable: true, pauseAtLimit: false, alerts: defaultAlerts });
    });

    it('should ignore the stored settings of a Pro trial organization', async () => {
      await givenOrganization({
        apiServiceLevel: ApiServiceLevelEnum.PRO,
        isTrial: true,
        includedEvents: 30_000,
        usageLimits: pausingUsageLimits,
      });
      notificationsCount = 40_000;

      const { events, usageLimits } = await executeUseCase();

      expect(events).to.deep.equal({
        current: 40_000,
        included: 30_000,
        headroom: null,
        limit: null,
        isPaused: false,
        onDemandPricePer1k: 1.2,
      });
      expect(usageLimits).to.deep.equal({ isConfigurable: false, pauseAtLimit: false, alerts: defaultAlerts });
    });

    it('should never pause an Enterprise organization', async () => {
      await givenOrganization({
        apiServiceLevel: ApiServiceLevelEnum.ENTERPRISE,
        includedEvents: 5_000_000,
        usageLimits: pausingUsageLimits,
      });

      const { events, usageLimits } = await executeUseCase();

      expect(events).to.deep.equal({
        current: 0,
        included: 5_000_000,
        headroom: null,
        limit: null,
        isPaused: false,
        onDemandPricePer1k: null,
      });
      expect(usageLimits).to.deep.equal({ isConfigurable: false, pauseAtLimit: false, alerts: defaultAlerts });
    });

    it('should hide the usage limits of a pausing Pro organization when usage limits are disabled', async () => {
      isUsageLimitsEnabled = false;
      await givenOrganization({
        apiServiceLevel: ApiServiceLevelEnum.PRO,
        includedEvents: 30_000,
        usageLimits: pausingUsageLimits,
      });
      notificationsCount = 40_000;

      const { events, usageLimits } = await executeUseCase();

      expect(events).to.deep.equal({
        current: 40_000,
        included: 30_000,
        headroom: null,
        limit: null,
        isPaused: false,
        onDemandPricePer1k: 1.2,
      });
      expect(usageLimits).to.equal(null);
    });

    it('should report a paused state for a Free organization at its included events when usage limits are disabled', async () => {
      isUsageLimitsEnabled = false;
      await givenOrganization({ apiServiceLevel: ApiServiceLevelEnum.FREE, includedEvents: 10_000 });
      notificationsCount = 10_000;

      const { events, usageLimits } = await executeUseCase();

      expect(events).to.deep.equal({
        current: 10_000,
        included: 10_000,
        headroom: null,
        limit: null,
        isPaused: true,
        onDemandPricePer1k: null,
      });
      expect(usageLimits).to.equal(null);
    });
  });
});
