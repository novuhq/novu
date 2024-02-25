import * as sinon from 'sinon';
import { expect } from 'chai';
import { ApiServiceLevelEnum } from '@novu/shared';

describe('Create setup intent', () => {
  const eeBilling = require('@novu/ee-billing');
  if (!eeBilling.CreateSetupIntent) {
    throw new Error("CreateSetupIntent doesn't exist");
  }
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { CreateSetupIntent } = eeBilling;

  const stubObject = {
    setupIntents: {
      list: () => {},
      create: () => {},
    },
  };

  const getCustomerUsecase = {
    execute: () => Promise.resolve({ id: 'customer_id' }),
  };

  const userRepository = {
    findById: () => Promise.resolve({ email: 'user_email' }),
  };

  let spyGetCustomer: sinon.SinonSpy;
  let stubCreateSetupIntent: sinon.SinonStub;
  let stubListSetupIntents: sinon.SinonStub;
  let stubGetUser: sinon.SinonStub;

  beforeEach(() => {
    spyGetCustomer = sinon.spy(getCustomerUsecase, 'execute');
    stubCreateSetupIntent = sinon.stub(stubObject.setupIntents, 'create').resolves({ client_secret: 'client_secret' });
    stubListSetupIntents = sinon.stub(stubObject.setupIntents, 'list').resolves({
      data: [
        {
          client_secret: 'client_secret',
          status: 'succeeded',
          metadata: {
            apiServiceLevel: ApiServiceLevelEnum.BUSINESS,
          },
        },
      ],
    });
    stubGetUser = sinon.stub(userRepository, 'findById').resolves({ email: 'user_email' });
  });

  afterEach(() => {
    spyGetCustomer.resetHistory();
    stubCreateSetupIntent.reset();
    stubListSetupIntents.reset();
  });

  const createUseCase = () => {
    const useCase = new CreateSetupIntent(stubObject, getCustomerUsecase, userRepository);

    return useCase;
  };

  it('should create a new setup intent', async () => {
    const useCase = createUseCase();
    const result = await useCase.execute({
      organizationId: 'organization_id',
      userId: 'user_id',
    });

    expect(stubCreateSetupIntent.lastCall.args.at(0)).to.deep.equal({
      customer: 'customer_id',
      metadata: {
        apiServiceLevel: ApiServiceLevelEnum.BUSINESS,
      },
    });

    expect(spyGetCustomer.lastCall.args.at(0)).to.deep.equal({
      organizationId: 'organization_id',
      email: 'user_email',
    });

    expect(stubListSetupIntents.lastCall.args.at(0)).to.deep.equal({
      customer: 'customer_id',
      limit: 1,
    });

    expect(result).to.equal('client_secret');
  });

  it('should setup intent with existing intent', async () => {
    stubListSetupIntents.resolves({
      data: [
        {
          client_secret: 'client_secret',
          status: 'requires_payment_method',
          metadata: {
            apiServiceLevel: ApiServiceLevelEnum.BUSINESS,
          },
        },
      ],
    });

    const useCase = createUseCase();
    const result = await useCase.execute({
      organizationId: 'organization_id',
      userId: 'user_id',
    });

    expect(stubCreateSetupIntent.callCount).to.equal(0);
    expect(spyGetCustomer.lastCall.args.at(0)).to.deep.equal({
      organizationId: 'organization_id',
      email: 'user_email',
    });

    expect(stubListSetupIntents.lastCall.args.at(0)).to.deep.equal({
      customer: 'customer_id',
      limit: 1,
    });

    expect(result).to.equal('client_secret');
  });

  it('should throw an error if user is not found', async () => {
    stubGetUser.rejects(new Error('User not found: user_id'));

    const useCase = createUseCase();

    try {
      await useCase.execute({
        organizationId: 'organization_id',
        userId: 'user_id',
      });
      throw new Error('Should not reach here');
    } catch (e) {
      expect(e.message).to.equal('User not found: user_id');
    }
  });

  it('should use the email from the user to get the customer', async () => {
    stubGetUser.resolves({ email: 'user_email' });
    const useCase = createUseCase();
    await useCase.execute({
      organizationId: 'organization_id',
      userId: 'user_id',
    });

    expect(spyGetCustomer.lastCall.args.at(0)).to.deep.equal({
      organizationId: 'organization_id',
      email: 'user_email',
    });
  });
});
