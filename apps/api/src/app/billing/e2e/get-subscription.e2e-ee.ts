import { CommunityOrganizationRepository } from '@novu/dal';
import {
  GetOrCreateCustomer,
  GetOrganizationPeriodUsage,
  GetOrganizationPeriodUsageCommand,
  GetSubscription,
  GetSubscriptionCommand,
} from '@novu/ee-billing';
import { ApiServiceLevelEnum, FeatureFlagsKeysEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import { Stripe } from 'stripe';
import { PAUSING_USAGE_LIMITS, useEnvironment } from './billing-e2e.helpers';

process.env.LAUNCH_DARKLY_SDK_KEY = ''; // disable Launch Darkly to allow test to define FF state

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

describe('GetSubscription #novu-v2', () => {
  const organizationRepository = new CommunityOrganizationRepository();
  let session: UserSession;
  let getOrCreateCustomerStub: sinon.SinonStub;
  let getOrganizationPeriodUsageStub: sinon.SinonStub;

  const executeUseCase = () =>
    (session.testServer?.getService(GetSubscription) as GetSubscription).execute(
      GetSubscriptionCommand.create({
        organizationId: session.organization._id,
      })
    );

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    await session.updateOrganizationServiceLevel(ApiServiceLevelEnum.BUSINESS);

    // BillingModule is imported by more than one module, so every instance must see the stubs.
    getOrCreateCustomerStub = sinon
      .stub(GetOrCreateCustomer.prototype, 'execute')
      .resolves(buildStripeCustomer() as Stripe.Customer);
    getOrganizationPeriodUsageStub = sinon
      .stub(GetOrganizationPeriodUsage.prototype, 'execute')
      .resolves({ notificationsCount: 1000000 });
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
        limit: null,
        isPaused: false,
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

    expect(getOrganizationPeriodUsageStub.lastCall.args.at(0)).to.deep.equal(
      GetOrganizationPeriodUsageCommand.create({
        organizationId: session.organization._id,
        startDate: new Date('2024-04-05T00:00:00.000Z'),
        endDate: new Date('2024-05-05T00:00:00.000Z'),
      })
    );
  });

  it('should throw error if no licensed subscription is found', async () => {
    const stripeCustomer = buildStripeCustomer();
    getOrCreateCustomerStub.resolves({
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
    });

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
    getOrCreateCustomerStub.resolves({
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
    });

    try {
      await executeUseCase();
      // shouldn't get here
      throw new Error();
    } catch (e) {
      expect(e.message).to.include("No metered subscription found for customerId: 'customer_id'");
    }
  });

  describe('with workflow run usage limits enabled', () => {
    useEnvironment({ [FeatureFlagsKeysEnum.IS_WORKFLOW_RUN_USAGE_LIMITS_ENABLED]: 'true' });

    it('should derive the limit and the usage limits settings from the stored settings of the organization', async () => {
      await session.updateOrganizationServiceLevel(ApiServiceLevelEnum.PRO);
      await organizationRepository.updateUsageLimits(session.organization._id, PAUSING_USAGE_LIMITS);
      getOrCreateCustomerStub.resolves(buildStripeCustomer('30000') as Stripe.Customer);
      getOrganizationPeriodUsageStub.resolves({ notificationsCount: 40_000 });

      const { events, usageLimits } = await executeUseCase();

      expect(events).to.deep.equal({ current: 40_000, included: 30_000, limit: 40_000, isPaused: true });
      expect(usageLimits).to.deep.equal({
        isConfigurable: true,
        onDemandPricePer1k: 1.2,
        settings: PAUSING_USAGE_LIMITS,
      });
    });
  });
});
