/* eslint-disable global-require */
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { ApiServiceLevelEnum } from '@novu/shared';
import sinon from 'sinon';
import { Stripe } from 'stripe';

type DeepPartial<T> = T extends object ? { [P in keyof T]?: DeepPartial<T[P]> } : T;

const mockedStripeSubscriptionItems: DeepPartial<Stripe.ApiList<Stripe.SubscriptionItem>> = {
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
};

const mockedStripeCustomer: DeepPartial<Stripe.Customer> = {
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
        items: mockedStripeSubscriptionItems,
      },
    ],
  },
};

describe('GetSubscription', async () => {
  let session: UserSession;

  const eeBilling = require('@novu/ee-billing');
  if (!eeBilling) {
    throw new Error('ee-billing does not exist');
  }

  const { GetPlatformNotificationUsageCommand, GetSubscription, GetSubscriptionCommand } = eeBilling;

  const communityOrganizationRepo = {
    findById: () =>
      Promise.resolve({
        _id: session.organization._id,
        apiServiceLevel: ApiServiceLevelEnum.BUSINESS,
      }),
  };
  const getPlatformNotificationUsage = {
    execute: () =>
      Promise.resolve([
        {
          _id: session.organization._id,
          notificationsCount: 1000000,
          apiServiceLevel: ApiServiceLevelEnum.BUSINESS,
        },
      ]),
  };
  let getOrCreateCustomer = {
    execute: () => Promise.resolve(mockedStripeCustomer),
  };
  let getPlatformNotificationUsageSpy: sinon.SinonSpy;

  const createUseCase = () => {
    const useCase = new GetSubscription(
      getOrCreateCustomer as any,
      getPlatformNotificationUsage as any,
      communityOrganizationRepo
    );

    return useCase;
  };

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    getPlatformNotificationUsageSpy = sinon.spy(getPlatformNotificationUsage, 'execute');
  });

  afterEach(() => {
    getPlatformNotificationUsageSpy.resetHistory();
  });

  it('should return the correct subscription details for a given organization', async () => {
    const result = await createUseCase().execute(
      GetSubscriptionCommand.create({
        organizationId: session.organization._id,
      })
    );

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
      },
      trial: {
        start: null,
        end: null,
        isActive: false,
        daysTotal: 0,
      },
    });
  });

  it('should fetch usage with the subscription period dates and organizationId', async () => {
    await createUseCase().execute(
      GetSubscriptionCommand.create({
        organizationId: session.organization._id,
      })
    );

    expect(getPlatformNotificationUsageSpy.lastCall.args.at(0)).to.deep.equal(
      GetPlatformNotificationUsageCommand.create({
        organizationId: session.organization._id,
        startDate: new Date('2024-04-05T00:00:00.000Z'),
        endDate: new Date('2024-05-05T00:00:00.000Z'),
      })
    );
  });

  it('should throw error if no licensed subscription is found', async () => {
    getOrCreateCustomer = {
      execute: () =>
        Promise.resolve({
          ...mockedStripeCustomer,
          subscriptions: {
            data: [
              {
                ...mockedStripeCustomer.subscriptions?.data?.[0],
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
        } as unknown as Stripe.Customer),
    };

    try {
      await createUseCase().execute(
        GetSubscriptionCommand.create({
          organizationId: session.organization._id,
        })
      );
      // shouldn't get here
      throw new Error();
    } catch (e) {
      expect(e.message).to.include("No licensed subscription found for customerId: 'customer_id'");
    }
  });

  it('should throw error if no metered subscription is found', async () => {
    getOrCreateCustomer = {
      execute: () =>
        Promise.resolve({
          ...mockedStripeCustomer,
          subscriptions: {
            data: [
              {
                ...mockedStripeCustomer.subscriptions?.data?.[0],
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
        } as unknown as Stripe.Customer),
    };

    try {
      await createUseCase().execute(
        GetSubscriptionCommand.create({
          organizationId: session.organization._id,
        })
      );
      // shouldn't get here
      throw new Error();
    } catch (e) {
      expect(e.message).to.include("No metered subscription found for customerId: 'customer_id'");
    }
  });
});
