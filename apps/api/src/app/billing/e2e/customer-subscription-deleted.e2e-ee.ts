import { ApiServiceLevelEnum, StripeBillingIntervalEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';

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
  organization: { _id: 'organization_id', apiServiceLevel: ApiServiceLevelEnum.BUSINESS },
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

describe.skip('webhook event - customer.subscription.deleted #novu-v2', () => {
  const eeBilling = require('@novu/ee-billing');
  if (!eeBilling) {
    throw new Error('ee-billing does not exist');
  }

  const {
    CustomerSubscriptionDeletedHandler,
    VerifyCustomer,
    UpdateServiceLevel,
    UpdateServiceLevelCommand,
    CreateSubscription,
  } = eeBilling;

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

  let verifyCustomerStub: sinon.SinonStub;
  let updateServiceLevelStub: sinon.SinonStub;
  let createSubscriptionStub: sinon.SinonStub;

  const analyticsServiceStub = {
    track: sinon.stub(),
    upsertGroup: sinon.stub(),
  };
  const invalidateCacheServiceStub = {
    invalidateByKey: sinon.stub(),
  };

  beforeEach(() => {
    updateServiceLevelStub = sinon.stub(UpdateServiceLevel.prototype, 'execute').resolves({});
    verifyCustomerStub = sinon.stub(VerifyCustomer.prototype, 'execute').resolves({});
    createSubscriptionStub = sinon.stub(CreateSubscription.prototype, 'execute').resolves({});
  });

  afterEach(() => {
    sinon.reset();
  });

  const createHandler = () => {
    const handler = new CustomerSubscriptionDeletedHandler(
      stripeStub,
      { execute: verifyCustomerStub },
      analyticsServiceStub,
      invalidateCacheServiceStub,
      { execute: updateServiceLevelStub },
      { execute: createSubscriptionStub }
    );

    return handler;
  };

  it('should exit early with unknown organization', async () => {
    verifyCustomerStub.resolves({
      organization: null,
      customer: { id: 'customer_id', metadata: { organizationId: 'org_id' } },
    });

    const handler = createHandler();
    await handler.handle({
      data: {
        object: {},
      },
    });

    expect(updateServiceLevelStub.called).to.be.false;
  });

  it('should cancel also metered subscriptions in case of cancellation of annual licensed subscription', async () => {
    const event = {
      data: {
        object: {
          id: 'current_subscription_id',
          customer: 'customer_id',
          cancellation_details: {
            reason: 'cancellation_requested',
          },
          items: {
            data: [
              {
                price: {
                  recurring: {
                    usage_type: 'licensed',
                    interval: StripeBillingIntervalEnum.YEAR,
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

    verifyCustomerStub.resolves({
      ...verifyCustomerMock,
      // existing subscriptions (apart from the deleted one)
      subscriptions: [
        {
          id: 'linked_metered_subscription_id',
          metadata: {
            parentSubscriptionId: 'current_subscription_id',
          },
          items: {
            data: [
              {
                price: {
                  recurring: { usage_type: 'metered', interval: 'month' },
                },
              },
            ],
          },
        },
      ],
    });

    // retrieve the deleted subscription from the event
    stripeStub.subscriptions.retrieve.resolves(event.data.object);

    const handler = createHandler();
    await handler.handle(event);

    expect(stripeStub.subscriptions.cancel.calledWith('linked_metered_subscription_id')).to.be.true;
  });

  it('should cancel also licensed subscriptions in case of cancellation of annual metered subscription', async () => {
    const event = {
      data: {
        object: {
          id: 'current_subscription_id',
          customer: 'customer_id',
          cancellation_details: {
            reason: 'cancellation_requested',
          },
          metadata: {
            parentSubscriptionId: 'licensed_subscription_id',
          },
          items: {
            data: [
              {
                price: {
                  recurring: {
                    usage_type: 'metered',
                    interval: StripeBillingIntervalEnum.MONTH,
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

    verifyCustomerStub.resolves({
      ...verifyCustomerMock,
      // existing subscriptions (apart from the deleted one)
      subscriptions: [
        {
          id: 'licensed_subscription_id',
          items: {
            data: [
              {
                price: {
                  recurring: { usage_type: 'licensed', interval: 'year' },
                },
              },
            ],
          },
        },
      ],
    });

    // retrieve the deleted subscription from the event
    stripeStub.subscriptions.retrieve.resolves(event.data.object);

    const handler = createHandler();
    await handler.handle(event);

    expect(stripeStub.subscriptions.cancel.calledWith('licensed_subscription_id')).to.be.true;
  });

  it('should create a free subscription if there are no subscriptions left', async () => {
    const event = {
      data: {
        object: {
          id: 'current_subscription_id',
          customer: 'customer_id',
          cancellation_details: {
            reason: 'cancellation_requested',
          },
          metadata: {},
          items: {
            data: [
              {
                price: {
                  recurring: {
                    usage_type: 'metered',
                    interval: StripeBillingIntervalEnum.MONTH,
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

    verifyCustomerStub.resolves({
      ...verifyCustomerMock,
      subscriptions: [],
    });

    // retrieve the deleted subscription from the event
    stripeStub.subscriptions.retrieve.resolves(event.data.object);

    const handler = createHandler();
    await handler.handle(event);

    expect(createSubscriptionStub.called).to.be.true;
    expect(
      updateServiceLevelStub.calledWith(
        UpdateServiceLevelCommand.create({
          organizationId: 'organization_id',
          apiServiceLevel: ApiServiceLevelEnum.FREE,
          isTrial: false,
        })
      )
    ).to.be.true;
  });

  it('should remain on the specific apiServiceLevel if there are subscriptions left', async () => {
    const event = {
      data: {
        object: {
          id: 'current_subscription_id',
          customer: 'customer_id',
          cancellation_details: {
            reason: 'cancellation_requested',
          },
          metadata: {},
          items: {
            data: [
              {
                price: {
                  recurring: {
                    usage_type: 'licensed',
                    interval: StripeBillingIntervalEnum.YEAR,
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

    verifyCustomerStub.resolves({
      ...verifyCustomerMock,
      subscriptions: [
        {
          id: 'remaining_subscription_id',
          items: {
            data: [
              {
                price: {
                  recurring: { usage_type: 'licensed', interval: 'month' },
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
          id: 'to_be_cancelled_subscription_id',
          metadata: {
            parentSubscriptionId: 'current_subscription_id',
          },
          items: {
            data: [
              {
                price: {
                  recurring: { usage_type: 'metered', interval: 'month' },
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
      ],
    });

    stripeStub.subscriptions.retrieve.resolves(event.data.object);

    const handler = createHandler();
    await handler.handle(event);

    expect(
      updateServiceLevelStub.calledWith(
        UpdateServiceLevelCommand.create({
          organizationId: 'organization_id',
          apiServiceLevel: ApiServiceLevelEnum.BUSINESS,
          isTrial: false,
        })
      )
    ).to.be.true;
  });

  it('should invalidate the subscription cache with known organization and licensed subscription', async () => {
    const event = {
      data: {
        object: {
          id: 'current_subscription_id',
          customer: 'customer_id',
          cancellation_details: {
            reason: 'cancellation_requested',
          },
          metadata: {},
          items: {
            data: [
              {
                price: {
                  recurring: {
                    usage_type: 'metered',
                    interval: StripeBillingIntervalEnum.MONTH,
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

    verifyCustomerStub.resolves({
      organization: { _id: 'organization_id', apiServiceLevel: ApiServiceLevelEnum.BUSINESS },
      customer: { id: 'customer_id', metadata: { organizationId: 'org_id' } },
      subscriptions: [],
    });

    const handler = createHandler();
    await handler.handle(event);

    expect(invalidateCacheServiceStub.invalidateByKey.called).to.be.true;
  });
});
