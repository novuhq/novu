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
          items: { data: [{ id: 'item_id_usage_notifications' }, { id: 'item_id_flat' }] },
        },
      ],
    },
  };

  beforeEach(() => {
    getPricesStub = sinon.stub(GetPrices.prototype, 'execute').resolves([
      {
        id: 'price_id_1',
      },
      {
        id: 'price_id_2',
      },
    ] as any);
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
    it('should create a new subscription if the customer has no subscriptions', async () => {
      const useCase = createUseCase();
      const customer = { ...mockCustomer, subscriptions: { data: [] } };

      await useCase.execute(
        UpsertSubscriptionCommand.create({
          customer: customer as any,
          apiServiceLevel: ApiServiceLevelEnum.BUSINESS,
        })
      );

      expect(createSubscriptionStub.lastCall.args).to.deep.equal([
        {
          customer: 'customer_id',
          items: [
            {
              price: 'price_id_1',
            },
            {
              price: 'price_id_2',
            },
          ],
        },
      ]);
    });

    it('should update the existing subscription if the customer has a subscription', async () => {
      const useCase = createUseCase();

      await useCase.execute(
        UpsertSubscriptionCommand.create({
          customer: mockCustomer as any,
          apiServiceLevel: ApiServiceLevelEnum.BUSINESS,
        })
      );

      expect(updateSubscriptionStub.lastCall.args).to.deep.equal([
        'subscription_id',
        {
          items: [
            {
              price: 'price_id_1',
            },
            {
              price: 'price_id_2',
            },
          ],
        },
      ]);
    });

    it('should throw an error if the customer has more than one subscription', async () => {
      const useCase = createUseCase();
      const customer = { ...mockCustomer, subscriptions: { data: [{}, {}] } };

      try {
        await useCase.execute(
          UpsertSubscriptionCommand.create({
            customer: customer as any,
            apiServiceLevel: ApiServiceLevelEnum.FREE,
          })
        );
        throw new Error('Should not reach here');
      } catch (e) {
        expect(e.message).to.equal(`Customer with id: 'customer_id' has more than one subscription`);
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
