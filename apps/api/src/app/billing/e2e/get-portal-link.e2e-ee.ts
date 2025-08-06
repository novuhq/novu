import { expect } from 'chai';
import sinon from 'sinon';

const dashboardOrigin = process.env.FRONT_BASE_URL;

describe('Get portal link #novu-v2', async () => {
  it('Get portal link', async () => {
    if (!require('@novu/ee-billing').GetPortalLink) {
      throw new Error("GetPortalLink doesn't exist");
    }
    const stubObject = {
      billingPortal: {
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

    const stub = sinon.stub(stubObject.billingPortal.sessions, 'create').resolves({ url: 'url' });

    const usecase = new (require('@novu/ee-billing').GetPortalLink)(stubObject, getCustomerUsecase);

    const result = await usecase.execute({
      environmentId: 'environment_dd',
      organizationId: 'organization_id',
      userId: 'user_id',
      origin: dashboardOrigin,
    });

    expect(stub.lastCall.args.at(0)).to.deep.equal({
      return_url: `${dashboardOrigin}/manage-account/billing`,
      customer: 'customer_id',
    });

    expect(spy.lastCall.args.at(0)).to.deep.equal({
      organizationId: 'organization_id',
    });

    expect(result).to.equal('url');
  });
});
