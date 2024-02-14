import * as sinon from 'sinon';
import { expect } from 'chai';
import { ApiServiceLevelEnum } from '@novu/shared';

describe('Create setup intent', async () => {
  it('Create setup intent', async () => {
    if (!require('@novu/ee-billing').CreateSetupIntent) {
      throw new Error("CreateSetupIntent doesn't exist");
    }
    const stubObject = {
      setupIntents: {
        list: () => {},
        create: () => {},
      },
    };

    const getCustomerUsecase = {
      execute: () =>
        Promise.resolve({
          id: 'customer_id',
        }),
    };

    const spy = sinon.spy(getCustomerUsecase, 'execute');

    const stubCreate = sinon.stub(stubObject.setupIntents, 'create').resolves({ client_secret: 'client_secret' });
    const stubList = sinon.stub(stubObject.setupIntents, 'list').resolves({
      data: [
        {
          status: 'succeded',
          metadata: {
            apiServiceLevel: ApiServiceLevelEnum.BUSINESS,
          },
        },
      ],
    });

    const usecase = new (require('@novu/ee-billing').CreateSetupIntent)(stubObject, getCustomerUsecase);

    const result = await usecase.execute({
      organizationId: 'organization_id',
      userId: 'user_id',
    });

    expect(stubCreate.lastCall.args.at(0)).to.deep.equal({
      customer: 'customer_id',
      metadata: {
        apiServiceLevel: ApiServiceLevelEnum.BUSINESS,
      },
    });

    expect(spy.lastCall.args.at(0)).to.deep.equal({
      organizationId: 'organization_id',
    });

    expect(stubList.lastCall.args.at(0)).to.deep.equal({
      customer: 'customer_id',
      limit: 1,
    });

    expect(result).to.equal('client_secret');
  });
});
