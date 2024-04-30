import * as sinon from 'sinon';
import { expect } from 'chai';
import { ApiServiceLevelEnum } from '@novu/shared';
import { StripeBillingIntervalEnum } from '@novu/ee-billing/src/stripe/types';

describe('Upsert setup intent', () => {
  const eeBilling = require('@novu/ee-billing');
  if (!eeBilling.UpsertSetupIntent) {
    throw new Error("UpsertSetupIntent doesn't exist");
  }
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { UpsertSetupIntent } = eeBilling;

  const stubObject = {
    setupIntents: {
      list: () => {},
      create: () => {},
      update: () => {},
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
  let stubUpdateSetupIntent: sinon.SinonStub;
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
            billingInterval: StripeBillingIntervalEnum.MONTH,
          },
        },
      ],
    });
    stubUpdateSetupIntent = sinon.stub(stubObject.setupIntents, 'update').resolves({});
    stubGetUser = sinon.stub(userRepository, 'findById').resolves({ email: 'user_email' });
  });

  afterEach(() => {
    spyGetCustomer.resetHistory();
    stubCreateSetupIntent.reset();
    stubListSetupIntents.reset();
    stubUpdateSetupIntent.reset();
  });

  const createUseCase = () => {
    const useCase = new UpsertSetupIntent(stubObject, getCustomerUsecase, userRepository);

    return useCase;
  };

  it('should create a new setup intent', async () => {
    const useCase = createUseCase();
    const result = await useCase.execute({
      organizationId: 'organization_id',
      userId: 'user_id',
      apiServiceLevel: ApiServiceLevelEnum.BUSINESS,
      billingInterval: StripeBillingIntervalEnum.MONTH,
    });

    expect(stubCreateSetupIntent.lastCall.args.at(0)).to.deep.equal({
      customer: 'customer_id',
      metadata: {
        apiServiceLevel: ApiServiceLevelEnum.BUSINESS,
        billingInterval: StripeBillingIntervalEnum.MONTH,
      },
    });

    expect(result).to.deep.equal({ clientSecret: 'client_secret' });
  });

  it('should setup intent with existing intent requiring update', async () => {
    stubListSetupIntents.resolves({
      data: [
        {
          id: 'intent_id',
          client_secret: 'client_secret',
          status: 'requires_payment_method',
          metadata: {
            apiServiceLevel: ApiServiceLevelEnum.BUSINESS,
            billingInterval: StripeBillingIntervalEnum.YEAR,
          },
        },
      ],
    });

    const useCase = createUseCase();
    const result = await useCase.execute({
      organizationId: 'organization_id',
      userId: 'user_id',
      apiServiceLevel: ApiServiceLevelEnum.BUSINESS,
      billingInterval: StripeBillingIntervalEnum.MONTH,
    });

    expect(
      stubUpdateSetupIntent.calledWith('intent_id', {
        metadata: {
          apiServiceLevel: ApiServiceLevelEnum.BUSINESS,
          billingInterval: StripeBillingIntervalEnum.MONTH,
        },
      })
    ).to.be.true;

    expect(result).to.deep.equal({ clientSecret: 'client_secret' });
  });

  it('should not create or update setup intent if existing intent matches', async () => {
    stubListSetupIntents.resolves({
      data: [
        {
          client_secret: 'client_secret',
          status: 'requires_payment_method',
          metadata: {
            apiServiceLevel: ApiServiceLevelEnum.BUSINESS,
            billingInterval: StripeBillingIntervalEnum.MONTH,
          },
        },
      ],
    });

    const useCase = createUseCase();
    const result = await useCase.execute({
      organizationId: 'organization_id',
      userId: 'user_id',
      apiServiceLevel: ApiServiceLevelEnum.BUSINESS,
      billingInterval: StripeBillingIntervalEnum.MONTH,
    });

    expect(stubCreateSetupIntent.callCount).to.equal(0);
    expect(stubUpdateSetupIntent.callCount).to.equal(0);
    expect(result).to.deep.equal({ clientSecret: 'client_secret' });
  });

  it('should throw an error if user is not found', async () => {
    stubGetUser.rejects(new Error('User not found: user_id'));

    const useCase = createUseCase();

    try {
      await useCase.execute({
        organizationId: 'organization_id',
        userId: 'user_id',
        apiServiceLevel: ApiServiceLevelEnum.BUSINESS,
        billingInterval: StripeBillingIntervalEnum.MONTH,
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
      apiServiceLevel: ApiServiceLevelEnum.BUSINESS,
      billingInterval: StripeBillingIntervalEnum.MONTH,
    });

    expect(spyGetCustomer.lastCall.args.at(0)).to.deep.equal({
      organizationId: 'organization_id',
      email: 'user_email',
    });
  });

  it('should throw an error when the apiServiceLevel is not BUSINESS', async () => {
    const useCase = createUseCase();
    try {
      await useCase.execute({
        organizationId: 'organization_id',
        userId: 'user_id',
        apiServiceLevel: ApiServiceLevelEnum.FREE,
        billingInterval: StripeBillingIntervalEnum.MONTH,
      });
      throw new Error('Should not reach here');
    } catch (e) {
      expect(e.message).to.equal(`API service level not allowed: ${ApiServiceLevelEnum.FREE}`);
    }
  });

  it('should throw an error when given an invalid billing interval', async () => {
    const useCase = createUseCase();
    try {
      await useCase.execute({
        organizationId: 'organization_id',
        userId: 'user_id',
        apiServiceLevel: ApiServiceLevelEnum.BUSINESS,
        billingInterval: 'invalid',
      });
      throw new Error('Should not reach here');
    } catch (e) {
      expect(e.message).to.equal(`Invalid billing interval: 'invalid'`);
    }
  });
});
