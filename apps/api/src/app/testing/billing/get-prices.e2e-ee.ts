import * as sinon from 'sinon';
import { expect } from 'chai';
import { ApiServiceLevelEnum } from '@novu/shared';

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
      billingInterval: 'month', // Example billing interval
      prices: {
        licensed: ['free_flat_monthly'],
        metered: ['free_usage_notifications'],
      },
    },
    {
      apiServiceLevel: ApiServiceLevelEnum.BUSINESS,
      billingInterval: 'month', // Example billing interval
      prices: {
        licensed: ['business_flat_monthly'],
        metered: ['business_usage_notifications'],
      },
    },
    {
      apiServiceLevel: ApiServiceLevelEnum.BUSINESS,
      billingInterval: 'year', // Example billing interval
      prices: {
        licensed: ['business_flat_annually'],
        metered: ['business_usage_notifications'],
      },
    },
    {
      apiServiceLevel: ApiServiceLevelEnum.ENTERPRISE,
      billingInterval: 'month', // Example billing interval
      prices: {
        licensed: ['enterprise_flat_monthly'],
        metered: ['enterprise_usage_notifications'],
      },
    },
    {
      apiServiceLevel: ApiServiceLevelEnum.ENTERPRISE,
      billingInterval: 'year', // Example billing interval
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
          billingInterval: 'month',
        })
      );
    } catch (e) {
      expect(e.message).to.include(`No prices found for apiServiceLevel: '${ApiServiceLevelEnum.BUSINESS}'`);
    }
  });
});
