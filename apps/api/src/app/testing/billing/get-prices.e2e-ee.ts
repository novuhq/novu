import * as sinon from 'sinon';
import { expect } from 'chai';
import { ApiServiceLevelEnum } from '@novu/shared';
import { StripeBillingIntervalEnum } from '@novu/ee-billing/src/stripe/types';

describe('GetPrices', () => {
  const eeBilling = require('@novu/ee-billing');
  if (!eeBilling) {
    throw new Error('ee-billing does not exist');
  }
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { GetPrices, GetPricesCommand } = eeBilling;

  const stripeStub = {
    prices: {
      list: sinon.stub(),
    },
  };
  let listPricesStub: sinon.SinonStub;

  beforeEach(() => {
    listPricesStub = stripeStub.prices.list;
    listPricesStub.onFirstCall().resolves({
      data: [{ id: 'licensed_price_id_1' }],
    });
    listPricesStub.onSecondCall().resolves({
      data: [{ id: 'metered_price_id_1' }],
    });
  });

  afterEach(() => {
    listPricesStub.reset();
  });

  const createUseCase = () => new GetPrices(stripeStub as any);

  const expectedPrices = [
    {
      apiServiceLevel: ApiServiceLevelEnum.FREE,
      billingInterval: StripeBillingIntervalEnum.MONTH,
      prices: {
        licensed: ['free_flat_monthly'],
        metered: ['free_usage_notifications'],
      },
    },
    {
      apiServiceLevel: ApiServiceLevelEnum.BUSINESS,
      billingInterval: StripeBillingIntervalEnum.MONTH,
      prices: {
        licensed: ['business_flat_monthly'],
        metered: ['business_usage_notifications'],
      },
    },
    {
      apiServiceLevel: ApiServiceLevelEnum.BUSINESS,
      billingInterval: StripeBillingIntervalEnum.YEAR,
      prices: {
        licensed: ['business_flat_annually'],
        metered: ['business_usage_notifications'],
      },
    },
    {
      apiServiceLevel: ApiServiceLevelEnum.ENTERPRISE,
      billingInterval: StripeBillingIntervalEnum.MONTH,
      prices: {
        licensed: ['enterprise_flat_monthly'],
        metered: ['enterprise_usage_notifications'],
      },
    },
    {
      apiServiceLevel: ApiServiceLevelEnum.ENTERPRISE,
      billingInterval: StripeBillingIntervalEnum.YEAR,
      prices: {
        licensed: ['enterprise_flat_annually'],
        metered: ['enterprise_usage_notifications'],
      },
    },
  ];

  expectedPrices
    .map(({ apiServiceLevel, billingInterval, prices }) => {
      return () => {
        describe(`apiServiceLevel of ${apiServiceLevel} and billingInterval of ${billingInterval}`, () => {
          it(`should fetch the prices list with the expected lookup keys`, async () => {
            const useCase = createUseCase();

            await useCase.execute(
              GetPricesCommand.create({
                apiServiceLevel,
                billingInterval,
              })
            );

            const allCallsArgs = listPricesStub.getCalls().map((call) => call.args[0]);
            expect(allCallsArgs).to.deep.equal([
              {
                lookup_keys: prices.licensed,
              },
              {
                lookup_keys: prices.metered,
              },
            ]);
          });
        });
      };
    })
    .forEach((test) => test());

  it(`should throw an error if no prices are found`, async () => {
    listPricesStub.onFirstCall().resolves({ data: [] });
    listPricesStub.onSecondCall().resolves({ data: [] });
    const useCase = createUseCase();

    try {
      await useCase.execute(
        GetPricesCommand.create({
          apiServiceLevel: ApiServiceLevelEnum.BUSINESS,
          billingInterval: StripeBillingIntervalEnum.MONTH,
        })
      );
    } catch (e) {
      expect(e.message).to.include(`No prices found for apiServiceLevel: '${ApiServiceLevelEnum.BUSINESS}'`);
    }
  });
});
