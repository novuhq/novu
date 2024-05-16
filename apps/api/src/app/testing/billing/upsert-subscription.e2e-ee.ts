import * as sinon from 'sinon';
import { OrganizationRepository } from '@novu/dal';
import { expect } from 'chai';
import { ApiServiceLevelEnum } from '@novu/shared';
import { StripeBillingIntervalEnum, StripeUsageTypeEnum } from '@novu/ee-billing/src/stripe/types';

describe('UpsertSubscription', () => {
  const eeBilling = require('@novu/ee-billing');
  if (!eeBilling) {
    throw new Error('ee-billing does not exist');
  }
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { UpsertSubscription, GetPrices, UpsertSubscriptionCommand } = eeBilling;

  const stripeStub = {
    subscriptions: {
      create: () => {},
      update: () => {},
      del: () => {},
    },
  };
  let updateSubscriptionStub: sinon.SinonStub;
  let createSubscriptionStub: sinon.SinonStub;
  let deleteSubscriptionStub: sinon.SinonStub;

  let getPricesStub: sinon.SinonStub;
  const repo = new OrganizationRepository();
  let updateOrgStub: sinon.SinonStub;

  const mockCustomerBase = {
    id: 'customer_id',
    deleted: false,
    metadata: {
      organizationId: 'organization_id',
    },
    subscriptions: {
      data: [
        {
          id: 'subscription_id',
          billing_cycle_anchor: 123456789,
          items: {
            data: [
              {
                id: 'item_id_usage_notifications',
                price: { recurring: { usage_type: StripeUsageTypeEnum.METERED } },
              },
              { id: 'item_id_flat', price: { recurring: { usage_type: StripeUsageTypeEnum.LICENSED } } },
            ],
          },
        },
      ],
    },
  };

  beforeEach(() => {
    getPricesStub = sinon.stub(GetPrices.prototype, 'execute').resolves({
      metered: [
        {
          id: 'price_id_notifications',
          recurring: { usage_type: StripeUsageTypeEnum.METERED },
        },
      ],
      licensed: [
        {
          id: 'price_id_flat',
          recurring: { usage_type: StripeUsageTypeEnum.LICENSED },
        },
      ],
    } as any);
    updateOrgStub = sinon.stub(repo, 'update').resolves({ matched: 1, modified: 1 });
    createSubscriptionStub = sinon.stub(stripeStub.subscriptions, 'create');
    updateSubscriptionStub = sinon.stub(stripeStub.subscriptions, 'update');
    deleteSubscriptionStub = sinon.stub(stripeStub.subscriptions, 'del');
  });

  afterEach(() => {
    getPricesStub.reset();
    updateOrgStub.reset();
    createSubscriptionStub.reset();
    updateSubscriptionStub.reset();
    deleteSubscriptionStub.reset();
  });

  const createUseCase = () => {
    const useCase = new UpsertSubscription(stripeStub as any, repo, { execute: getPricesStub } as any);

    return useCase;
  };

  describe('Subscription upserting', () => {
    describe('ZERO active subscriptions', () => {
      const mockCustomerNoSubscriptions = {
        ...mockCustomerBase,
        subscriptions: { data: [] },
      };

      describe('Monthly Billing Interval', () => {
        it('should create a single subscription with monthly prices', async () => {
          const useCase = createUseCase();

          await useCase.execute(
            UpsertSubscriptionCommand.create({
              customer: mockCustomerNoSubscriptions as any,
              apiServiceLevel: ApiServiceLevelEnum.BUSINESS,
              billingInterval: StripeBillingIntervalEnum.MONTH,
            })
          );

          expect(createSubscriptionStub.lastCall.args).to.deep.equal([
            {
              customer: 'customer_id',
              items: [
                {
                  price: 'price_id_notifications',
                },
                {
                  price: 'price_id_flat',
                },
              ],
            },
          ]);
        });

        it('should set the trial configuration for the subscription when trial days are provided', async () => {
          const useCase = createUseCase();

          await useCase.execute(
            UpsertSubscriptionCommand.create({
              customer: mockCustomerNoSubscriptions as any,
              apiServiceLevel: ApiServiceLevelEnum.BUSINESS,
              billingInterval: StripeBillingIntervalEnum.MONTH,
              trialPeriodDays: 10,
            })
          );

          expect(createSubscriptionStub.lastCall.args).to.deep.equal([
            {
              customer: 'customer_id',
              trial_period_days: 10,
              trial_settings: {
                end_behavior: {
                  missing_payment_method: 'cancel',
                },
              },
              items: [
                {
                  price: 'price_id_notifications',
                },
                {
                  price: 'price_id_flat',
                },
              ],
            },
          ]);
        });
      });

      describe('Annual Billing Interval', () => {
        it('should create two subscriptions, one with monthly prices and one with annual prices', async () => {
          const useCase = createUseCase();

          await useCase.execute(
            UpsertSubscriptionCommand.create({
              customer: mockCustomerNoSubscriptions as any,
              apiServiceLevel: ApiServiceLevelEnum.BUSINESS,
              billingInterval: StripeBillingIntervalEnum.YEAR,
            })
          );

          expect(createSubscriptionStub.callCount).to.equal(2);
          expect(createSubscriptionStub.getCalls().map((call) => call.args)).to.deep.equal([
            [
              {
                customer: 'customer_id',
                items: [
                  {
                    price: 'price_id_flat',
                  },
                ],
              },
            ],
            [
              {
                customer: 'customer_id',
                items: [
                  {
                    price: 'price_id_notifications',
                  },
                ],
              },
            ],
          ]);
        });

        it('should set the trial configuration for both subscriptions when trial days are provided', async () => {
          const useCase = createUseCase();

          await useCase.execute(
            UpsertSubscriptionCommand.create({
              customer: mockCustomerNoSubscriptions as any,
              apiServiceLevel: ApiServiceLevelEnum.BUSINESS,
              billingInterval: StripeBillingIntervalEnum.YEAR,
              trialPeriodDays: 10,
            })
          );

          expect(createSubscriptionStub.callCount).to.equal(2);
          expect(createSubscriptionStub.getCalls().map((call) => call.args)).to.deep.equal([
            [
              {
                customer: 'customer_id',
                trial_period_days: 10,
                trial_settings: {
                  end_behavior: {
                    missing_payment_method: 'cancel',
                  },
                },
                items: [
                  {
                    price: 'price_id_flat',
                  },
                ],
              },
            ],
            [
              {
                customer: 'customer_id',
                trial_period_days: 10,
                trial_settings: {
                  end_behavior: {
                    missing_payment_method: 'cancel',
                  },
                },
                items: [
                  {
                    price: 'price_id_notifications',
                  },
                ],
              },
            ],
          ]);
        });
      });
    });

    describe('ONE active subscription', () => {
      const mockCustomerOneSubscription = {
        ...mockCustomerBase,
        subscriptions: {
          data: [
            {
              id: 'subscription_id',
              items: {
                data: [
                  {
                    id: 'item_id_usage_notifications',
                    price: { recurring: { usage_type: StripeUsageTypeEnum.METERED } },
                  },
                  { id: 'item_id_flat', price: { recurring: { usage_type: StripeUsageTypeEnum.LICENSED } } },
                ],
              },
            },
          ],
        },
      };

      describe('Monthly Billing Interval', () => {
        it('should update the existing subscription', async () => {
          const useCase = createUseCase();

          await useCase.execute(
            UpsertSubscriptionCommand.create({
              customer: mockCustomerOneSubscription as any,
              apiServiceLevel: ApiServiceLevelEnum.FREE,
              billingInterval: StripeBillingIntervalEnum.MONTH,
            })
          );

          expect(updateSubscriptionStub.lastCall.args).to.deep.equal([
            'subscription_id',
            {
              items: [
                {
                  id: 'item_id_usage_notifications',
                  price: 'price_id_notifications',
                },
                {
                  id: 'item_id_flat',
                  price: 'price_id_flat',
                },
              ],
            },
          ]);
        });
      });

      describe('Annual Billing Interval', () => {
        it('should create a new annual subscription and update the existing subscription', async () => {
          const useCase = createUseCase();

          await useCase.execute(
            UpsertSubscriptionCommand.create({
              customer: mockCustomerOneSubscription as any,
              apiServiceLevel: ApiServiceLevelEnum.FREE,
              billingInterval: StripeBillingIntervalEnum.YEAR,
            })
          );

          expect(createSubscriptionStub.lastCall.args).to.deep.equal([
            {
              customer: 'customer_id',
              items: [
                {
                  price: 'price_id_flat',
                },
              ],
            },
          ]);

          expect(updateSubscriptionStub.lastCall.args).to.deep.equal([
            'subscription_id',
            {
              items: [
                {
                  id: 'item_id_usage_notifications',
                  price: 'price_id_notifications',
                },
                {
                  id: 'item_id_flat',
                  deleted: true,
                },
              ],
            },
          ]);
        });

        it('should set the trial configuration for the newly created annual subscription from the existing licensed subscription', async () => {
          const useCase = createUseCase();
          const customer = {
            ...mockCustomerBase,
            subscriptions: {
              data: [
                {
                  id: 'subscription_id',
                  trial_end: 123456789,
                  items: {
                    data: [
                      {
                        id: 'item_id_usage_notifications',
                        price: { recurring: { usage_type: StripeUsageTypeEnum.METERED } },
                      },
                      { id: 'item_id_flat', price: { recurring: { usage_type: StripeUsageTypeEnum.LICENSED } } },
                    ],
                  },
                },
              ],
            },
          };

          await useCase.execute(
            UpsertSubscriptionCommand.create({
              customer,
              apiServiceLevel: ApiServiceLevelEnum.BUSINESS,
              billingInterval: StripeBillingIntervalEnum.YEAR,
            })
          );

          expect(createSubscriptionStub.lastCall.args).to.deep.equal([
            {
              customer: 'customer_id',
              trial_end: 123456789,
              trial_settings: {
                end_behavior: {
                  missing_payment_method: 'cancel',
                },
              },
              items: [
                {
                  price: 'price_id_flat',
                },
              ],
            },
          ]);
        });
      });

      it('should throw an error if the licensed subscription is not found', async () => {
        const useCase = createUseCase();
        const customer = {
          ...mockCustomerBase,
          subscriptions: {
            data: [{ items: { data: [{ price: { recurring: { usage_type: 'invalid' } } }] } }],
          },
        };

        try {
          await useCase.execute(
            UpsertSubscriptionCommand.create({
              customer: customer as any,
              apiServiceLevel: ApiServiceLevelEnum.FREE,
              billingInterval: StripeBillingIntervalEnum.MONTH,
            })
          );
          throw new Error('Should not reach here');
        } catch (e) {
          expect(e.message).to.equal(`No licensed subscription found for customer with id: 'customer_id'`);
        }
      });
    });

    describe('TWO active subscriptions', () => {
      const mockCustomerTwoSubscriptions = {
        ...mockCustomerBase,
        subscriptions: {
          data: [
            {
              id: 'subscription_id_1',
              items: {
                data: [{ id: 'item_id_flat', price: { recurring: { usage_type: StripeUsageTypeEnum.LICENSED } } }],
              },
            },
            {
              id: 'subscription_id_2',
              items: {
                data: [
                  {
                    id: 'item_id_usage_notifications',
                    price: { recurring: { usage_type: StripeUsageTypeEnum.METERED } },
                  },
                ],
              },
            },
          ],
        },
      };

      describe('Monthly Billing Interval', () => {
        it('should delete the licensed subscription and update the metered subscription', async () => {
          const useCase = createUseCase();

          await useCase.execute(
            UpsertSubscriptionCommand.create({
              customer: mockCustomerTwoSubscriptions as any,
              apiServiceLevel: ApiServiceLevelEnum.FREE,
              billingInterval: StripeBillingIntervalEnum.MONTH,
            })
          );

          expect(deleteSubscriptionStub.lastCall.args).to.deep.equal(['subscription_id_1', { prorate: true }]);

          expect(updateSubscriptionStub.lastCall.args).to.deep.equal([
            'subscription_id_2',
            {
              items: [
                {
                  id: 'item_id_flat',
                  price: 'price_id_flat',
                },
                {
                  id: 'item_id_usage_notifications',
                  price: 'price_id_notifications',
                },
              ],
            },
          ]);
        });
      });

      describe('Annual Billing Interval', () => {
        it('should update the existing subscriptions', async () => {
          const useCase = createUseCase();

          await useCase.execute(
            UpsertSubscriptionCommand.create({
              customer: mockCustomerTwoSubscriptions as any,
              apiServiceLevel: ApiServiceLevelEnum.FREE,
              billingInterval: StripeBillingIntervalEnum.YEAR,
            })
          );

          expect(updateSubscriptionStub.getCalls().map((call) => call.args)).to.deep.equal([
            [
              'subscription_id_1',
              {
                items: [
                  {
                    id: 'item_id_flat',
                    price: 'price_id_flat',
                  },
                ],
              },
            ],
            [
              'subscription_id_2',
              {
                items: [
                  {
                    id: 'item_id_flat',
                    deleted: true,
                  },
                  {
                    id: 'item_id_usage_notifications',
                    price: 'price_id_notifications',
                  },
                ],
              },
            ],
          ]);
        });
      });

      it('should throw an error if the licensed subscription is not found', async () => {
        const useCase = createUseCase();
        const customer = {
          ...mockCustomerBase,
          subscriptions: {
            data: [
              { items: { data: [{ price: { recurring: { usage_type: StripeUsageTypeEnum.METERED } } }] } },
              { items: { data: [{ price: { recurring: { usage_type: 'invalid' } } }] } },
            ],
          },
        };

        try {
          await useCase.execute(
            UpsertSubscriptionCommand.create({
              customer: customer as any,
              apiServiceLevel: ApiServiceLevelEnum.FREE,
              billingInterval: StripeBillingIntervalEnum.MONTH,
            })
          );
          throw new Error('Should not reach here');
        } catch (e) {
          expect(e.message).to.equal(`No licensed subscription found for customer with id: 'customer_id'`);
        }
      });

      it('should throw an error if the metered subscription is not found', async () => {
        const useCase = createUseCase();
        const customer = {
          ...mockCustomerBase,
          subscriptions: {
            data: [
              { items: { data: [{ price: { recurring: { usage_type: StripeUsageTypeEnum.LICENSED } } }] } },
              { items: { data: [{ price: { recurring: { usage_type: 'invalid' } } }] } },
            ],
          },
        };

        try {
          await useCase.execute(
            UpsertSubscriptionCommand.create({
              customer: customer as any,
              apiServiceLevel: ApiServiceLevelEnum.FREE,
              billingInterval: StripeBillingIntervalEnum.MONTH,
            })
          );
          throw new Error('Should not reach here');
        } catch (e) {
          expect(e.message).to.equal(`No metered subscription found for customer with id: 'customer_id'`);
        }
      });
    });

    describe('More than TWO active subscriptions', () => {
      it('should throw an error if the customer has more than two subscription', async () => {
        const useCase = createUseCase();
        const customer = { ...mockCustomerBase, subscriptions: { data: [{}, {}, {}] } };

        try {
          await useCase.execute(
            UpsertSubscriptionCommand.create({
              customer: customer as any,
              apiServiceLevel: ApiServiceLevelEnum.FREE,
              billingInterval: StripeBillingIntervalEnum.MONTH,
            })
          );
          throw new Error('Should not reach here');
        } catch (e) {
          expect(e.message).to.equal(`Customer with id: 'customer_id' has more than two subscriptions`);
        }
      });
    });

    it('should throw an error if the billing interval is not supported', async () => {
      const useCase = createUseCase();
      const customer = { ...mockCustomerBase, subscriptions: { data: [{}, {}] } };

      try {
        await useCase.execute(
          UpsertSubscriptionCommand.create({
            customer: customer as any,
            apiServiceLevel: ApiServiceLevelEnum.FREE,
            billingInterval: 'invalid',
          })
        );
        throw new Error('Should not reach here');
      } catch (e) {
        expect(e.message).to.equal(`Invalid billing interval: 'invalid'`);
      }
    });

    describe('Organization entity update', () => {
      it('should update the organization with the new apiServiceLevel', async () => {
        const useCase = createUseCase();
        const customer = { ...mockCustomerBase, subscriptions: { data: [{}, {}] } };

        await useCase.execute(
          UpsertSubscriptionCommand.create({
            customer: mockCustomerBase as any,
            billingInterval: StripeBillingIntervalEnum.MONTH,
            apiServiceLevel: ApiServiceLevelEnum.BUSINESS,
          })
        );

        expect(updateOrgStub.lastCall.args).to.deep.equal([
          { _id: 'organization_id' },
          { apiServiceLevel: ApiServiceLevelEnum.BUSINESS },
        ]);
      });
    });
  });
});
