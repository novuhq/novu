/* eslint-disable global-require */
import sinon from 'sinon';
import { expect } from 'chai';
import { ApiServiceLevelEnum } from '@novu/shared';
// eslint-disable-next-line no-restricted-imports
import { StripeBillingIntervalEnum } from '@novu/ee-billing/src/stripe/types';

const mockCheckoutSessionCompletedEvent = {
  type: 'checkout.session.completed',
  data: {
    object: {
      id: 'cs_id_1',
      object: 'checkout.session',
      amount_subtotal: 270000,
      amount_total: 270000,
      billing_address_collection: 'auto',
      cancel_url: 'http://localhost:4200/manage-account/billing?result=canceled',
      created: 1728552369,
      currency: 'usd',
      customer: 'cus_R0JFO85Q8ThjEZ',
      expires_at: 1728638769,
      metadata: {
        apiServiceLevel: 'business',
        billingInterval: 'year',
      },
      mode: 'subscription',
      payment_method_collection: 'always',
      payment_method_types: ['card'],
      payment_status: 'paid',
      status: 'complete',
      subscription: 'current_subscription_id',
      success_url: 'http://localhost:4200/manage-account/billing?result=success&session_id={CHECKOUT_SESSION_ID}',
      tax_id_collection: {
        enabled: true,
        required: 'never',
      },
    },
  },
};

const verifyCustomerMock = {
  customer: {
    id: 'customer_id',
    deleted: false,
    metadata: {
      organizationId: 'organization_id',
    },
    subscriptions: {
      data: [{ id: 'subscription_id' }],
    },
  },
  adminUser: {
    _id: 'admin_user_id',
  },
  organization: { _id: 'organization_id', apiServiceLevel: ApiServiceLevelEnum.FREE },
  subscriptions: [
    {
      id: 'subscription_id',
      items: {
        data: [
          {
            id: 'item_id_usage_notifications',
            plan: {
              interval: StripeBillingIntervalEnum.MONTH,
            },
            price: {
              recurring: {
                usage_type: 'licensed',
              },
              product: {
                metadata: {
                  apiServiceLevel: ApiServiceLevelEnum.BUSINESS,
                },
              },
            },
          },
          {
            id: 'item_id_flat',
            plan: {
              interval: StripeBillingIntervalEnum.MONTH,
            },
            price: {
              recurring: {
                usage_type: 'licensed',
              },
              product: {
                metadata: {
                  apiServiceLevel: ApiServiceLevelEnum.BUSINESS,
                },
              },
            },
          },
        ],
      },
    },
    {
      id: 'current_subscription_id',
      default_payment_method: 'payment_method_id',
      items: {
        data: [
          {
            id: 'item_id_usage_notifications',
            plan: {
              interval: 'test',
            },
            price: {
              recurring: {
                usage_type: 'licensed',
              },
              product: {
                metadata: {
                  apiServiceLevel: 'test',
                },
              },
            },
          },
          {
            id: 'item_id_flat',
            plan: {
              interval: 'test',
            },
            price: {
              recurring: {
                usage_type: 'licensed',
              },
              product: {
                metadata: {
                  apiServiceLevel: 'test',
                },
              },
            },
          },
        ],
      },
    },
  ],
};

const getPricesMock = {
  metered: [{ id: 'price_id' }],
  licensed: [{ id: 'price_id' }],
};

describe('webhook event - checkout.session.completed', () => {
  const stripeStub = {
    customers: {
      update: sinon.stub(),
    },
    subscriptions: {
      create: sinon.stub(),
      retrieve: sinon.stub(),
      cancel: sinon.stub(),
    },
  };

  const eeBilling = require('@novu/ee-billing');
  if (!eeBilling) {
    throw new Error('ee-billing does not exist');
  }

  const { CheckoutSessionCompletedHandler, VerifyCustomer, GetPrices } = eeBilling;

  let verifyCustomerStub: sinon.SinonStub;
  let getPricesStub: sinon.SinonStub;
  const analyticsServiceStub = {
    track: sinon.stub(),
  };
  const invalidateCacheServiceStub = {
    invalidateByKey: sinon.stub(),
  };

  beforeEach(() => {
    verifyCustomerStub = sinon.stub(VerifyCustomer.prototype, 'execute').resolves(verifyCustomerMock);
    getPricesStub = sinon.stub(GetPrices.prototype, 'execute').resolves(getPricesMock);
  });

  afterEach(() => {
    sinon.reset();
  });

  const createHandler = () => {
    const handler = new CheckoutSessionCompletedHandler(
      stripeStub,
      { execute: verifyCustomerStub },
      analyticsServiceStub,
      invalidateCacheServiceStub,
      { execute: getPricesStub }
    );

    return handler;
  };

  it('should exit early with unknown organization', async () => {
    verifyCustomerStub.resolves({
      organization: null,
      customer: { id: 'customer_id', metadata: { organizationId: 'org_id' } },
    });

    const handler = createHandler();
    await handler.handle(mockCheckoutSessionCompletedEvent);

    expect(analyticsServiceStub.track.called).to.be.false;
  });

  it('should cancel existing subscriptions except the one that triggered the event', async () => {
    const handler = createHandler();
    await handler.handle(mockCheckoutSessionCompletedEvent);

    expect(stripeStub.subscriptions.cancel.callCount).to.equal(1);
    expect(stripeStub.subscriptions.cancel.lastCall.args[0]).to.equal('subscription_id');
  });

  it('should update the customer with the default payment method', async () => {
    const handler = createHandler();
    await handler.handle(mockCheckoutSessionCompletedEvent);

    expect(stripeStub.customers.update.lastCall.args[1]).to.deep.equal({
      invoice_settings: {
        default_payment_method: 'payment_method_id',
      },
    });
  });

  it('should create a linked monthly metered subscription if yearly licensed subscription was bought', async () => {
    const mockCheckoutSessionCompletedEventYearly = {
      ...mockCheckoutSessionCompletedEvent,
      data: {
        object: {
          ...mockCheckoutSessionCompletedEvent.data.object,
          metadata: {
            billingInterval: StripeBillingIntervalEnum.YEAR,
            apiServiceLevel: ApiServiceLevelEnum.BUSINESS,
          },
        },
      },
    };

    const handler = createHandler();
    await handler.handle(mockCheckoutSessionCompletedEventYearly);

    expect(stripeStub.subscriptions.create.lastCall.args[0]).to.deep.equal({
      customer: 'customer_id',
      items: [{ price: 'price_id' }],
      metadata: {
        parentSubscriptionId: 'current_subscription_id',
      },
    });
  });

  it('should invalidate the subscription cache', async () => {
    const handler = createHandler();
    await handler.handle(mockCheckoutSessionCompletedEvent);

    expect(invalidateCacheServiceStub.invalidateByKey.called).to.be.true;
  });
});
