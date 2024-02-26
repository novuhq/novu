import * as sinon from 'sinon';
import { expect } from 'chai';
import { ApiServiceLevelEnum } from '@novu/shared';

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
  };

  const eeBilling = require('@novu/ee-billing');
  if (!eeBilling) {
    throw new Error('ee-billing does not exist');
  }
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { SetupIntentSucceededHandler, UpsertSubscription, VerifyCustomer } = eeBilling;

  describe('setup_intent.succeeded', () => {
    let updateCustomerStub: sinon.SinonStub;

    let verifyCustomerStub: sinon.SinonStub;
    let upsertSubscriptionStub: sinon.SinonStub;

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
        organization: { _id: 'organization_id', apiServiceLevel: ApiServiceLevelEnum.FREE },
      } as any);
      upsertSubscriptionStub = sinon.stub(UpsertSubscription.prototype, 'execute').resolves({
        id: 'subscription_id',
      } as any);
      updateCustomerStub = sinon.stub(stripeStub.customers, 'update').resolves({});
    });

    const createHandler = () => {
      const handler = new SetupIntentSucceededHandler(
        stripeStub as any,
        { execute: verifyCustomerStub } as any,
        { execute: upsertSubscriptionStub } as any
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
    it('Should handle customer.subscription.created event with known organization', async () => {
      // @TODO: Implement test
      expect(true).to.equal(true);
    });

    it('Should exit early with unknown organization', async () => {
      // @TODO: Implement test
      expect(true).to.equal(true);
    });
  });
});
