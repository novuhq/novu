import * as sinon from 'sinon';
import { expect } from 'chai';
import { ApiServiceLevelEnum } from '@novu/shared';
import { StripeBillingIntervalEnum } from '@novu/ee-billing/src/stripe/types';

const mockSetupIntentSucceededEvent = {
  type: 'setup_intent.succeeded',
  data: {
    object: {
      id: '',
      object: 'setup_intent',
      created: 0,
      customer: 'customer_id',
      livemode: false,
      metadata: {
        apiServiceLevel: ApiServiceLevelEnum.BUSINESS,
        billingInterval: StripeBillingIntervalEnum.MONTH,
      },
      payment_method_options: null,
      payment_method_types: [] as string[],
      status: 'succeeded',
      application: null,
      automatic_payment_methods: null,
      cancellation_reason: null,
      client_secret: null,
      description: null,
      flow_directions: null,
      last_setup_error: null,
      latest_attempt: null,
      mandate: null,
      next_action: null,
      on_behalf_of: null,
      payment_method: 'payment_method_id',
      single_use_mandate: null,
      usage: '',
    },
  },
  id: '',
  object: 'event',
  api_version: null,
  created: 0,
  livemode: false,
  pending_webhooks: 0,
  request: null,
} as const;

describe('Stripe webhooks', () => {
  const stripeStub = {
    customers: {
      update: () => {},
    },
    subscriptions: {
      retrieve: () =>
        Promise.resolve({
          items: {
            data: [
              {
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
        }),
    },
  };

  const eeBilling = require('@novu/ee-billing');
  if (!eeBilling) {
    throw new Error('ee-billing does not exist');
  }
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { SetupIntentSucceededHandler, CustomerSubscriptionCreatedHandler, UpsertSubscription, VerifyCustomer } =
    eeBilling;

  describe('setup_intent.succeeded', () => {
    let updateCustomerStub: sinon.SinonStub;

    let verifyCustomerStub: sinon.SinonStub;
    let upsertSubscriptionStub: sinon.SinonStub;
    const analyticsServiceStub = {
      track: sinon.stub(),
    };

    beforeEach(() => {
      verifyCustomerStub = sinon.stub(VerifyCustomer.prototype, 'execute').resolves({
        customer: {
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
        },
        adminUser: {
          _id: 'admin_user_id',
        },
        organization: { _id: 'organization_id', apiServiceLevel: ApiServiceLevelEnum.FREE },
      } as any);
      upsertSubscriptionStub = sinon.stub(UpsertSubscription.prototype, 'execute').resolves({
        licensed: { id: 'licensed_subscription_id' },
        metered: { id: 'metered_subscription_id' },
      } as any);
      updateCustomerStub = sinon.stub(stripeStub.customers, 'update').resolves({});
    });

    const createHandler = () => {
      const handler = new SetupIntentSucceededHandler(
        stripeStub as any,
        { execute: verifyCustomerStub } as any,
        { execute: upsertSubscriptionStub } as any,
        analyticsServiceStub as any
      );

      return handler;
    };

    it('should exit early with invalid api service level', async () => {
      const disallowedApiServiceLevel = ApiServiceLevelEnum.FREE;

      const handler = createHandler();
      await handler.handle({
        ...mockSetupIntentSucceededEvent,
        data: {
          ...mockSetupIntentSucceededEvent.data,
          object: {
            ...mockSetupIntentSucceededEvent.data.object,
            metadata: {
              apiServiceLevel: disallowedApiServiceLevel,
            },
          },
        },
      });

      expect(verifyCustomerStub.callCount).to.equal(0);
    });

    it('Should exit early with unknown organization', async () => {
      verifyCustomerStub.resolves({ organization: null });
      const handler = createHandler();
      await handler.handle(mockSetupIntentSucceededEvent);

      expect(updateCustomerStub.callCount).to.equal(0);
    });

    it('Should update the customer with the default payment method', async () => {
      const handler = createHandler();
      await handler.handle(mockSetupIntentSucceededEvent);

      expect(updateCustomerStub.callCount).to.equal(1);
    });

    it('Should upsert a subscription', async () => {
      const handler = createHandler();
      await handler.handle(mockSetupIntentSucceededEvent);

      expect(upsertSubscriptionStub.callCount).to.equal(1);
    });
  });

  describe('customer.subscription.created', () => {
    let verifyCustomerStub: sinon.SinonStub;
    const organizationRepositoryStub = {
      update: sinon.stub().resolves({ matched: 1, modified: 1 }),
    };
    const analyticsServiceStub = {
      track: sinon.stub(),
      upsertGroup: sinon.stub(),
    };

    beforeEach(() => {
      verifyCustomerStub = sinon.stub(VerifyCustomer.prototype, 'execute').resolves({
        customer: {
          id: 'customer_id',
          deleted: false,
          metadata: {
            organizationId: 'organization_id',
          },
        },
        subscriptions: [
          {
            id: 'sub_123',
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
            id: 'sub_1234',
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
        adminUser: {
          _id: 'admin_user_id',
        },
        organization: { _id: 'organization_id', apiServiceLevel: ApiServiceLevelEnum.FREE },
      } as any);
    });

    afterEach(() => {
      organizationRepositoryStub.update.reset();
    });

    const createHandler = () => {
      const handler = new CustomerSubscriptionCreatedHandler(
        { execute: verifyCustomerStub } as any,
        organizationRepositoryStub,
        analyticsServiceStub as any
      );

      return handler;
    };

    it('should handle event with known organization', async () => {
      const event = {
        data: {
          object: {
            id: 'sub_123',
            customer: 'cus_123',
            items: [
              {
                id: 'si_123',
                data: {
                  plan: {
                    interval: StripeBillingIntervalEnum.MONTH,
                  },
                },
              },
            ],
          },
        },
        created: 1234567890,
      };

      const handler = createHandler();
      await handler.handle(event);

      expect(
        organizationRepositoryStub.update.calledWith(
          { _id: 'organization_id' },
          { apiServiceLevel: ApiServiceLevelEnum.BUSINESS }
        )
      ).to.be.true;
    });

    it('should exit early with unknown organization', async () => {
      const event = {
        data: {
          object: {
            id: 'sub_123',
            customer: 'cus_123',
            items: [
              {
                id: 'si_123',
                data: {
                  plan: {
                    interval: StripeBillingIntervalEnum.MONTH,
                  },
                },
              },
            ],
          },
        },
        created: 1234567890,
      };

      verifyCustomerStub.resolves({
        organization: null,
        customer: { id: 'customer_id', metadata: { organizationId: 'org_id' } },
      });

      const handler = createHandler();
      await handler.handle(event);

      expect(organizationRepositoryStub.update.called).to.be.false;
    });

    it('should handle event with known organization and licensed subscription', async () => {
      const event = {
        data: {
          object: {
            id: 'sub_123',
            customer: 'cus_123',
            items: [
              {
                id: 'si_123',
                data: {
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
              },
            ],
          },
        },
        created: 1234567890,
      };

      const handler = createHandler();
      await handler.handle(event);

      expect(
        organizationRepositoryStub.update.calledWith(
          { _id: 'organization_id' },
          { apiServiceLevel: ApiServiceLevelEnum.BUSINESS }
        )
      ).to.be.true;
    });

    it('should exit early with known organization and metered subscription', async () => {
      const event = {
        data: {
          object: {
            id: 'sub_123',
            customer: 'cus_123',
            items: [
              {
                id: 'si_123',
                data: {
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
              },
            ],
          },
        },
        created: 1234567890,
      };

      const handler = createHandler();
      await handler.handle(event);

      expect(
        organizationRepositoryStub.update.calledWith(
          { _id: 'organization_id' },
          { apiServiceLevel: ApiServiceLevelEnum.BUSINESS }
        )
      ).to.be.true;
    });

    it('should exit early with known organization and invalid apiServiceLevel', async () => {
      const event = {
        data: {
          object: {
            id: 'sub_1234',
            customer: 'cus_123',
            items: [
              {
                id: 'si_123',
                data: {
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
              },
            ],
          },
        },
        created: 1234567890,
      };

      stripeStub.subscriptions.retrieve = () =>
        Promise.resolve({
          items: {
            data: [
              {
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
                price: {
                  recurring: {
                    usage_type: 'licensed',
                  },
                  product: {
                    metadata: {
                      apiServiceLevel: 'invalid' as any,
                    },
                  },
                },
              },
            ],
          },
        });

      const handler = createHandler();
      await handler.handle(event);

      expect(organizationRepositoryStub.update.called).to.be.false;
    });
  });
});
