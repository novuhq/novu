import { ApiServiceLevelEnum, StripeBillingIntervalEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';

const mockCustomerSubscriptionCreatedEvent = {
  data: {
    object: {
      id: 'subscription_id',
      customer: 'customer_id',
      items: {
        data: [
          {
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
  },
  created: 1234567890,
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

describe('webhook event - customer.subscription.created #novu-v2', () => {
  const eeBilling = require('@novu/ee-billing');
  if (!eeBilling) {
    throw new Error('ee-billing does not exist');
  }

  const { CustomerSubscriptionCreatedHandler, VerifyCustomer, UpdateServiceLevel } = eeBilling;

  let verifyCustomerStub: sinon.SinonStub;
  let updateServiceLevelStub: sinon.SinonStub;

  const analyticsServiceStub = {
    track: sinon.stub(),
    upsertGroup: sinon.stub(),
  };
  const invalidateCacheServiceStub = {
    invalidateByKey: sinon.stub(),
  };

  beforeEach(() => {
    updateServiceLevelStub = sinon.stub(UpdateServiceLevel.prototype, 'execute').resolves({});
    verifyCustomerStub = sinon.stub(VerifyCustomer.prototype, 'execute').resolves(verifyCustomerMock);
  });

  afterEach(() => {
    sinon.reset();
  });

  const createHandler = () => {
    const handler = new CustomerSubscriptionCreatedHandler(
      { execute: verifyCustomerStub },
      analyticsServiceStub,
      invalidateCacheServiceStub,
      { execute: updateServiceLevelStub }
    );

    return handler;
  };

  it('should exit early with unknown organization', async () => {
    verifyCustomerStub.resolves({
      organization: null,
      customer: { id: 'customer_id', metadata: { organizationId: 'org_id' } },
    });

    const handler = createHandler();
    await handler.handle(mockCustomerSubscriptionCreatedEvent);

    expect(updateServiceLevelStub.called).to.be.false;
  });

  it('should handle event with known organization and licensed subscription', async () => {
    const handler = createHandler();
    await handler.handle(mockCustomerSubscriptionCreatedEvent);

    expect(updateServiceLevelStub.lastCall.args.at(0)).to.deep.equal({
      organizationId: 'organization_id',
      apiServiceLevel: ApiServiceLevelEnum.BUSINESS,
      isTrial: false,
    });
  });

  it('should invalidate the subscription cache with known organization and licensed subscription', async () => {
    const handler = createHandler();
    await handler.handle(mockCustomerSubscriptionCreatedEvent);

    expect(invalidateCacheServiceStub.invalidateByKey.called).to.be.true;
  });

  it('should exit early with known organization and metered subscription', async () => {
    const event = {
      data: {
        object: {
          ...mockCustomerSubscriptionCreatedEvent.data.object,
          items: {
            data: [
              {
                plan: {
                  interval: StripeBillingIntervalEnum.MONTH,
                },
                price: {
                  recurring: {
                    usage_type: 'metered',
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
      },
      created: 1234567890,
    };

    const handler = createHandler();
    await handler.handle(event);

    expect(updateServiceLevelStub.called).to.be.true;
  });

  it('should exit early with known organization and invalid apiServiceLevel', async () => {
    const event = {
      data: {
        object: {
          ...mockCustomerSubscriptionCreatedEvent.data.object,
          items: {
            id: 'item_id_usage_notifications',
            data: [
              {
                plan: {
                  interval: StripeBillingIntervalEnum.MONTH,
                },
                price: {
                  recurring: {
                    usage_type: 'licensed',
                  },
                  product: {
                    metadata: {
                      apiServiceLevel: 'invalid',
                    },
                  },
                },
              },
            ],
          },
        },
      },
      created: 1234567890,
    };

    verifyCustomerStub.resolves({
      ...verifyCustomerMock,
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
                      apiServiceLevel: 'invalid',
                    },
                  },
                },
              },
            ],
          },
        },
      ],
    });

    const handler = createHandler();
    await handler.handle(event);

    expect(updateServiceLevelStub.called).to.be.false;
  });
});
