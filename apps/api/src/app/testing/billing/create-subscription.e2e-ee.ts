/* eslint-disable global-require */
import sinon from 'sinon';
import { expect } from 'chai';
import { ApiServiceLevelEnum } from '@novu/shared';
// eslint-disable-next-line no-restricted-imports
import {
  StripeBillingIntervalEnum,
  StripeUsageTypeEnum,
  StripeSubscriptionStatusEnum,
} from '@novu/ee-billing/src/stripe/types';

describe('CreateSubscription', () => {
  const eeBilling = require('@novu/ee-billing');
  if (!eeBilling) {
    throw new Error('ee-billing does not exist');
  }

  const { CreateSubscription, GetPrices, UpdateServiceLevel, CreateSubscriptionCommand } = eeBilling;

  const stripeStub = {
    subscriptions: {
      create: () => {},
    },
  };
  let createSubscriptionStub: sinon.SinonStub;
  let getPricesStub: sinon.SinonStub;
  let updateServiceLevelStub: sinon.SinonStub;

  const mockSubscription = {
    id: 'subscription_id',
    status: StripeSubscriptionStatusEnum.ACTIVE,
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
  };

  const mockCustomerBase = {
    id: 'customer_id',
    deleted: false,
    metadata: {
      organizationId: 'organization_id',
    },
    subscriptions: {
      data: [mockSubscription],
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
    updateServiceLevelStub = sinon.stub(UpdateServiceLevel.prototype, 'execute').resolves({});
    createSubscriptionStub = sinon.stub(stripeStub.subscriptions, 'create').resolves(mockSubscription);
  });

  afterEach(() => {
    getPricesStub.reset();
    updateServiceLevelStub.reset();
    createSubscriptionStub.reset();
  });

  const createUseCase = () => {
    const useCase = new CreateSubscription(
      stripeStub as any,
      { execute: updateServiceLevelStub } as any,
      { execute: getPricesStub } as any
    );

    return useCase;
  };

  describe('Subscription creation', () => {
    describe('Monthly Billing Interval', () => {
      it('should create a single subscription with monthly prices', async () => {
        const useCase = createUseCase();

        const mockCustomerNoSubscriptions = {
          ...mockCustomerBase,
          subscriptions: { data: [] },
        };

        await useCase.execute(
          CreateSubscriptionCommand.create({
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

        const mockCustomerNoSubscriptions = {
          ...mockCustomerBase,
          subscriptions: { data: [] },
        };

        await useCase.execute(
          CreateSubscriptionCommand.create({
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

        const mockCustomerNoSubscriptions = {
          ...mockCustomerBase,
          subscriptions: { data: [] },
        };

        await useCase.execute(
          CreateSubscriptionCommand.create({
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

        const mockCustomerNoSubscriptions = {
          ...mockCustomerBase,
          subscriptions: { data: [] },
        };

        await useCase.execute(
          CreateSubscriptionCommand.create({
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

    it('should throw an error if the customer has more than two subscription', async () => {
      const useCase = createUseCase();
      const customer = { ...mockCustomerBase, subscriptions: { data: [{}, {}, {}] } };

      try {
        await useCase.execute(
          CreateSubscriptionCommand.create({
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

    it('should throw an error if the billing interval is not supported', async () => {
      const useCase = createUseCase();
      const customer = { ...mockCustomerBase, subscriptions: { data: [{}, {}] } };

      try {
        await useCase.execute(
          CreateSubscriptionCommand.create({
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

    it('should update the organization with the new apiServiceLevel', async () => {
      const useCase = createUseCase();

      await useCase.execute(
        CreateSubscriptionCommand.create({
          customer: mockCustomerBase as any,
          billingInterval: StripeBillingIntervalEnum.MONTH,
          apiServiceLevel: ApiServiceLevelEnum.BUSINESS,
        })
      );

      expect(updateServiceLevelStub.lastCall.args).to.deep.equal([
        { organizationId: 'organization_id', apiServiceLevel: ApiServiceLevelEnum.BUSINESS, isTrial: false },
      ]);
    });
  });
});
