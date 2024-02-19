import * as sinon from 'sinon';
import { OrganizationRepository } from '@novu/dal';
import { expect } from 'chai';
import { ApiServiceLevelEnum } from '@novu/shared';

describe('Stripe webhooks', async () => {
  it('Should handle setup intent succeded event', async () => {
    if (!require('@novu/ee-billing').SetupIntentSucceededHandler || !require('@novu/ee-billing').UpsertSubscription) {
      throw new Error("SetupIntentSucceededHandler doesn't exist");
    }
    const stubObject = {
      customers: {
        retrieve: () => {},
        update: () => {},
      },
      subscriptions: {
        update: () => {},
      },
      prices: {
        list: () => {},
      },
    };
    const listPricesStub = sinon.stub(stubObject.prices, 'list').resolves({
      data: [
        {
          id: 'price_id',
        },
      ],
    });
    const updateCustomerStub = sinon.stub(stubObject.customers, 'update').resolves({});
    const getCustomerStub = sinon.stub(stubObject.customers, 'retrieve').resolves(
      Promise.resolve({
        deleted: false,
        metadata: {
          organizationId: 'organization_id',
        },
        subscriptions: {
          data: [
            {
              id: 'subscription_id',
              items: { data: [{ id: 'item_id' }] },
            },
          ],
        },
      })
    );
    const repo = new OrganizationRepository();
    const updateSubscriptionStub = sinon.stub(stubObject.subscriptions, 'update').resolves({});
    const updateOrgStub = sinon.stub(repo, 'update').resolves({ matched: 1, modified: 1 });
    const upsertSubscription = new (require('@novu/ee-billing').UpsertSubscription)(stubObject, repo);
    const handler = new (require('@novu/ee-billing').SetupIntentSucceededHandler)(upsertSubscription, stubObject);

    await handler.handle({
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
          payment_method_types: [],
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
    });

    expect(getCustomerStub.lastCall.args.at(0)).to.deep.equal('customer_id');
    expect(getCustomerStub.lastCall.args.at(1)).to.deep.equal({
      expand: ['subscriptions'],
    });

    expect(updateSubscriptionStub.lastCall.args.at(0)).to.equal('subscription_id');
    expect(updateSubscriptionStub.lastCall.args.at(1)).to.deep.equal({
      items: [
        {
          price: 'price_id',
        },
      ],
    });
    expect(updateOrgStub.lastCall.args).to.deep.equal([{ _id: 'organization_id' }, { apiServiceLevel: 'business' }]);

    expect(updateCustomerStub.lastCall.args).to.deep.equal([
      'customer_id',
      { invoice_settings: { default_payment_method: 'payment_method_id' } },
    ]);

    expect(listPricesStub.lastCall.args).to.deep.equal([
      {
        lookup_keys: ['business_flat_monthly', 'business_usage_notifications'],
      },
    ]);
  });
});
