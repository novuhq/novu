import * as sinon from 'sinon';
import { OrganizationRepository } from '@novu/dal';
import { expect } from 'chai';
import { ApiServiceLevelEnum } from '@novu/shared';

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
    },
  };
  let updateSubscriptionStub: sinon.SinonStub;
  let createSubscriptionStub: sinon.SinonStub;

  let getPricesStub: sinon.SinonStub;
  const repo = new OrganizationRepository();
  let updateOrgStub: sinon.SinonStub;

  const mockCustomer = {
    id: 'customer_id',
    deleted: false,
    metadata: {
      organizationId: 'organization_id',
    },
    subscriptions: {
      data: [
        {
          id: 'subscription_id',
          items: {
            data: [
              { id: 'item_id_usage_notifications', price: { recurring: { usage_type: 'metered' } } },
              { id: 'item_id_flat', price: { recurring: { usage_type: 'licensed' } } },
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
          id: 'price_id_metered_1',
        },
      ],
      licensed: [
        {
          id: 'price_id_licensed_1',
        },
      ],
    } as any);
    updateOrgStub = sinon.stub(repo, 'update').resolves({ matched: 1, modified: 1 });
    createSubscriptionStub = sinon.stub(stripeStub.subscriptions, 'create');
    updateSubscriptionStub = sinon.stub(stripeStub.subscriptions, 'update');
  });

  afterEach(() => {
    getPricesStub.reset();
    updateOrgStub.reset();
    createSubscriptionStub.reset();
    updateSubscriptionStub.reset();
  });

  const createUseCase = () => {
    const useCase = new UpsertSubscription(stripeStub as any, repo, { execute: getPricesStub } as any);

    return useCase;
  };

  describe('Subscription upserting', () => {
    describe('No subscriptions', () => {
      it('should create a single subscription with monthly prices when billingInterval is month', async () => {
        const useCase = createUseCase();
        const customer = { ...mockCustomer, subscriptions: { data: [] } };

        await useCase.execute(
          UpsertSubscriptionCommand.create({
            customer: customer as any,
            apiServiceLevel: ApiServiceLevelEnum.BUSINESS,
            billingInterval: 'month',
          })
        );

        expect(createSubscriptionStub.lastCall.args).to.deep.equal([
          {
            customer: 'customer_id',
            items: [
              {
                price: 'price_id_metered_1',
              },
              {
                price: 'price_id_licensed_1',
              },
            ],
          },
        ]);
      });

      it('should create two subscriptions, one with monthly prices and one with annual prices when billingInterval is year', async () => {
        const useCase = createUseCase();
        const customer = { ...mockCustomer, subscriptions: { data: [] } };

        await useCase.execute(
          UpsertSubscriptionCommand.create({
            customer: customer as any,
            apiServiceLevel: ApiServiceLevelEnum.BUSINESS,
            billingInterval: 'year',
          })
        );

        expect(createSubscriptionStub.callCount).to.equal(2);
        expect(createSubscriptionStub.getCalls().flatMap((call) => call.args)).to.deep.equal([
          {
            customer: 'customer_id',
            items: [
              {
                price: 'price_id_licensed_1',
              },
            ],
          },
          {
            customer: 'customer_id',
            items: [
              {
                price: 'price_id_metered_1',
              },
            ],
          },
        ]);
      });
    });

    describe('One subscription', () => {
      it('should create a new annual subscription and update the existing subscription if the customer has one subscription and billingInterval is month', async () => {
        const useCase = createUseCase();

        await useCase.execute(
          UpsertSubscriptionCommand.create({
            customer: mockCustomer as any,
            apiServiceLevel: ApiServiceLevelEnum.FREE,
            billingInterval: 'month',
          })
        );

        expect(createSubscriptionStub.lastCall.args).to.deep.equal([
          {
            customer: 'customer_id',
            items: [
              {
                price: 'price_id_metered_1',
              },
              {
                price: 'price_id_licensed_1',
              },
            ],
          },
        ]);
      });

      it('should throw an error if the billing interval is not supported', async () => {
        const useCase = createUseCase();
        const customer = { ...mockCustomer, subscriptions: { data: [{}, {}] } };

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

      it('should throw an error if the customer has more than two subscription', async () => {
        const useCase = createUseCase();
        const customer = { ...mockCustomer, subscriptions: { data: [{}, {}, {}] } };

        try {
          await useCase.execute(
            UpsertSubscriptionCommand.create({
              customer: customer as any,
              apiServiceLevel: ApiServiceLevelEnum.FREE,
              billingInterval: 'month',
            })
          );
          throw new Error('Should not reach here');
        } catch (e) {
          expect(e.message).to.equal(`Customer with id: 'customer_id' has more than two subscriptions`);
        }
      });
    });

    describe('Organization entity update', () => {
      it('should update the organization with the new apiServiceLevel', async () => {
        const useCase = createUseCase();

        await useCase.execute(
          UpsertSubscriptionCommand.create({
            customer: mockCustomer as any,
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
