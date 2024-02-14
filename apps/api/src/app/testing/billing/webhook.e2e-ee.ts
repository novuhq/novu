import * as sinon from 'sinon';
import { OrganizationRepository } from '@novu/dal';
import { expect } from 'chai';
import { ApiServiceLevelEnum } from '@novu/shared';
import { SetupIntentSucceededHandler } from '@novu/ee-billing';

describe('Stripe webhooks', async () => {
  it('Should handle setup intent succeded event', async () => {
    if (!require('@novu/ee-billing').SetupIntentSucceededHandler) {
      throw new Error("SetupIntentSucceededHandler doesn't exist");
    }
    const stubObject = {
      customers: {
        retrieve: () => {},
      },
      products: {
        search: () => {},
      },
      subscriptionItems: {
        update: () => {},
      },
    };
    const getCustomerStub = sinon.stub(stubObject.customers, 'retrieve').resolves(
      Promise.resolve({
        deleted: false,
        metadata: {
          organizationId: 'organization_id',
        },
        subscriptions: {
          data: [
            {
              items: { data: [{ id: 'item_id' }] },
            },
          ],
        },
      })
    );
    const getProductStub = sinon.stub(stubObject.products, 'search').resolves(
      Promise.resolve({
        data: [
          {
            metadata: {
              apiServiceLevel: ApiServiceLevelEnum.BUSINESS,
            },
            default_price: 'price_id',
          },
        ],
      })
    );
    const repo = new OrganizationRepository();
    const updateSubscriptionStub = sinon.stub(stubObject.subscriptionItems, 'update').resolves({});
    const updateOrgStub = sinon.stub(repo, 'update').resolves({ matched: 1, modified: 1 });
    const handler: SetupIntentSucceededHandler = new (require('@novu/ee-billing').SetupIntentSucceededHandler)(
      stubObject,
      repo
    );

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
          payment_method: null,
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

    expect(getProductStub.lastCall.args.at(0)).to.deep.equal({
      query: 'metadata["apiServiceLevel"]:"business"',
      limit: 1,
    });

    expect(updateSubscriptionStub.lastCall.args.at(0)).to.equal('item_id');
    expect(updateSubscriptionStub.lastCall.args.at(1)).to.deep.equal({ price: 'price_id' });
    expect(updateOrgStub.lastCall.args).to.deep.equal([{ _id: 'organization_id' }, { apiServiceLevel: 'business' }]);
  });
});
