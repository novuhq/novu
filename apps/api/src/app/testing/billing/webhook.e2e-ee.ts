import * as sinon from 'sinon';
import { OrganizationRepository } from '@novu/dal';
import { expect } from 'chai';
import { ApiServiceLevelEnum } from '@novu/shared';

describe('Stripe webhooks', async () => {
  it('Should handle checkout session completed event', async () => {
    if (!require('@novu/ee-billing').CheckoutSessionCompletedHandler) {
      throw new Error("CheckoutSessionCompletedHandler doesn't exist");
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
            default_price: 'price_id',
          },
        ],
      })
    );
    const updateSubscriptionStub = sinon.stub(stubObject.subscriptionItems, 'update').resolves({});
    const handler = new (require('@novu/ee-billing').CheckoutSessionCompletedHandler)(
      stubObject,
      new OrganizationRepository()
    );

    await handler.handle({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: '',
          object: 'checkout.session',
          after_expiration: null,
          allow_promotion_codes: null,
          amount_subtotal: null,
          amount_total: null,
          automatic_tax: null as any,
          billing_address_collection: null,
          cancel_url: null,
          client_reference_id: null,
          consent: null,
          consent_collection: null,
          created: 0,
          currency: null,
          custom_fields: [],
          custom_text: null as any,
          customer: 'customer_id',
          customer_creation: null,
          customer_details: null,
          customer_email: null,
          expires_at: 0,
          invoice: null,
          invoice_creation: null,
          livemode: false,
          locale: null,
          metadata: null,
          mode: 'payment',
          payment_intent: null,
          payment_link: null,
          payment_method_collection: null,
          payment_method_options: null,
          payment_method_types: [],
          payment_status: 'no_payment_required',
          recovered_from: null,
          setup_intent: null,
          shipping_address_collection: null,
          shipping_cost: null,
          shipping_details: null,
          shipping_options: [],
          status: null,
          submit_type: null,
          subscription: null,
          success_url: '',
          total_details: null,
          url: null,
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
  });

  it('Should handle customer subscription created', async () => {
    if (!require('@novu/ee-billing').CustomerSubscriptionCreatedHandler) {
      throw new Error("CustomerSubscriptionCreatedHandler doesn't exist");
    }
    const stubObject = {
      customers: {
        retrieve: () => {},
      },
      products: {
        retrieve: () => ({
          metadata: {
            apiServiceLevel: ApiServiceLevelEnum.BUSINESS,
          },
        }),
      },
    };
    const repo = new OrganizationRepository();
    const handler = new (require('@novu/ee-billing').CustomerSubscriptionCreatedHandler)(stubObject, repo);

    const getCustomerStub = sinon.stub(stubObject.customers, 'retrieve').resolves(
      Promise.resolve({
        deleted: false,
        metadata: {
          organizationId: 'organization_id',
        },
      })
    );

    const getOrganizationStub = sinon.stub(repo, 'findById').resolves({
      _id: 'organization_id',
      name: 'Test',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      apiServiceLevel: ApiServiceLevelEnum.FREE,
    });

    const updateOrganizationStub = sinon.stub(repo, 'update').resolves({} as any);

    const price: any = {
      product: 'product_id',
    };

    await handler.handle({
      type: 'customer.subscription.created',
      data: {
        object: {
          id: '',
          object: 'subscription',
          application: null,
          application_fee_percent: null,
          automatic_tax: undefined as any,
          billing_cycle_anchor: 0,
          billing_thresholds: null,
          cancel_at: null,
          cancel_at_period_end: false,
          canceled_at: null,
          cancellation_details: null,
          collection_method: 'charge_automatically',
          created: 0,
          currency: '',
          current_period_end: 0,
          current_period_start: 0,
          customer: 'customer_id',
          days_until_due: null,
          default_payment_method: null,
          default_source: null,
          description: null,
          discount: null,
          ended_at: null,
          items: {
            object: 'list',
            data: [
              {
                id: '',
                object: undefined as any,
                billing_thresholds: null,
                created: 0,
                metadata: {},
                quantity: 0,
                subscription: 'subscription_id',
                tax_rates: [],
                plan: undefined as any,
                price,
              },
            ],
            has_more: false,
            url: '',
          },
          latest_invoice: null,
          livemode: false,
          metadata: {
            apiServiceLevel: 'business',
          },
          next_pending_invoice_item_invoice: null,
          on_behalf_of: null,
          pause_collection: null,
          payment_settings: null,
          pending_invoice_item_interval: null,
          pending_setup_intent: null,
          pending_update: null,
          schedule: null,
          start_date: 0,
          status: 'active',
          test_clock: null,
          transfer_data: null,
          trial_end: null,
          trial_settings: null,
          trial_start: null,
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

    expect(getCustomerStub.lastCall.args.at(0)).to.equal('customer_id');
    expect(getOrganizationStub.lastCall.args.at(0)).to.equal('organization_id');
    expect(updateOrganizationStub.lastCall.args).to.deep.equal([
      { _id: 'organization_id' },
      { apiServiceLevel: 'business' },
    ]);
  });
});
