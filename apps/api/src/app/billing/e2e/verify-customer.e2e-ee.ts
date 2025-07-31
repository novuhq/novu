// biome-ignore lint/style/noRestrictedImports: <explanation>
import { Logger } from '@nestjs/common';
import { CommunityOrganizationRepository } from '@novu/dal';
import { VerifyCustomerCommand } from '@novu/ee-billing';
import { ApiServiceLevelEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';

describe('VerifyCustomer #novu-v2', () => {
  const eeBilling = require('@novu/ee-billing');
  if (!eeBilling) {
    throw new Error('ee-billing does not exist');
  }

  const { VerifyCustomer } = eeBilling;

  const stripeStub = {
    customers: {
      retrieve: () => {},
    },
    subscriptions: {
      retrieve: () => {},
    },
  };
  let getCustomerStub: sinon.SinonStub;

  let getSubscriptionStub: sinon.SinonStub;

  const repo = new CommunityOrganizationRepository();
  let getOrgStub: sinon.SinonStub;

  beforeEach(() => {
    getCustomerStub = sinon.stub(stripeStub.customers, 'retrieve').resolves({
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
    });

    getSubscriptionStub = sinon.stub(stripeStub.subscriptions, 'retrieve').resolves({
      id: 'subscription_id',
      items: {
        data: [
          {
            id: 'item_id_usage_notifications',
            plan: {
              interval: 'month',
            },
          },
          {
            id: 'item_id_flat',
            plan: {
              interval: 'month',
            },
          },
        ],
      },
    });

    getOrgStub = sinon
      .stub(repo, 'findById')
      .resolves({ _id: 'organization_id', apiServiceLevel: ApiServiceLevelEnum.FREE } as any);
  });

  afterEach(() => {
    getCustomerStub.reset();

    getOrgStub.reset();
  });

  const createUseCase = () => {
    const useCase = new VerifyCustomer(stripeStub as any, repo);

    return useCase;
  };

  it('Should throw an error if the Customer does not exist', async () => {
    getCustomerStub.resolves(null);
    const useCase = createUseCase();

    try {
      await useCase.execute(
        VerifyCustomerCommand.create({
          customerId: 'customer_id',
        })
      );
      throw new Error('Should not reach here');
    } catch (e) {
      expect(e.message).to.equal(`Customer not found: 'customer_id'`);
    }
  });

  it('Should throw an error if the Customer is deleted', async () => {
    getCustomerStub.resolves({ deleted: true });
    const useCase = createUseCase();

    try {
      await useCase.execute(
        VerifyCustomerCommand.create({
          customerId: 'customer_id',
        })
      );
      throw new Error('Should not reach here');
    } catch (e) {
      expect(e.message).to.equal(`Customer is deleted: 'customer_id'`);
    }
  });

  it('Should return the organization and customer', async () => {
    const useCase = createUseCase();
    const result = await useCase.execute(
      VerifyCustomerCommand.create({
        customerId: 'customer_id',
      })
    );

    expect(result.organization?._id).to.equal('organization_id');
    expect(result.customer?.id).to.equal('customer_id');
    expect(result.customer?.subscriptions?.data[0].id).to.equal('subscription_id');
  });

  it('Should log a message and continue if the organization does not exist', async () => {
    getOrgStub.resolves(null);
    const useCase = createUseCase();
    const logStub = sinon.stub(Logger, 'verbose');

    const result = await useCase.execute(
      VerifyCustomerCommand.create({
        customerId: 'customer_id',
      })
    );

    expect(result.organization).to.equal(null);
    expect(logStub.lastCall.args[0]).to.equal(`Organization not found: 'organization_id'`);

    logStub.restore();
  });
});
