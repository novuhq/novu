import * as sinon from 'sinon';
import { expect } from 'chai';

describe('Get checkout link', async () => {
  it('Get checkout link', async () => {
    if (!require('@novu/ee-billing').GetCheckoutLink) {
      throw new Error("GetCheckoutLink doesn't exist");
    }
    const stubObject = {
      checkout: {
        sessions: {
          create: () => {},
        },
      },
    };

    const getCustomerUsecase = {
      execute: () =>
        Promise.resolve({
          id: 'customer_id',
        }),
    };

    const spy = sinon.spy(getCustomerUsecase, 'execute');

    const stub = sinon.stub(stubObject.checkout.sessions, 'create').resolves({ url: 'url' });

    const usecase = new (require('@novu/ee-billing').GetCheckoutLink)(stubObject, getCustomerUsecase);

    const result = await usecase.execute({
      environmentId: 'environment_dd',
      organizationId: 'organization_id',
      userId: 'user_id',
    });

    expect(stub.lastCall.args.at(0)).to.deep.equal({
      mode: 'setup',
      currency: 'usd',
      success_url: `${process.env.FRONT_BASE_URL}/settings/billing`,
      cancel_url: `${process.env.FRONT_BASE_URL}/settings/billing`,
      customer: 'customer_id',
    });

    expect(spy.lastCall.args.at(0)).to.deep.equal({
      organizationId: 'organization_id',
    });

    expect(result).to.equal('url');
  });
});
