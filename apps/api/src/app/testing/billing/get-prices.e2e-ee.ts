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
      list: () => {},
    },
  };
  let listPricesStub: sinon.SinonStub;

  beforeEach(() => {
    listPricesStub = sinon.stub(stripeStub.prices, 'list').resolves({
      data: [
        {
          id: 'price_id_1',
        },
        {
          id: 'price_id_2',
        },
      ],
    });
  });

  afterEach(() => {
    listPricesStub.reset();
  });

  const createUseCase = () => {
    const useCase = new GetPrices(stripeStub as any);

    return useCase;
  };

  const expectedPrices = [
    {
      apiServiceLevel: ApiServiceLevelEnum.FREE,
      prices: ['free_usage_notifications'],
    },
    {
      apiServiceLevel: ApiServiceLevelEnum.BUSINESS,
      prices: ['business_flat_monthly', 'business_usage_notifications'],
    },
  ];
  expectedPrices
    .map(({ apiServiceLevel, prices }) => {
      return () => {
        describe(`apiServiceLevel of ${apiServiceLevel}`, () => {
          it(`should fetch the prices list with the expected values`, async () => {
            const useCase = createUseCase();

            await useCase.execute(
              GetPricesCommand.create({
                apiServiceLevel: apiServiceLevel,
              })
            );

            expect(listPricesStub.lastCall.args[0].lookup_keys).to.contain.members(prices);
          });

          it(`should throw an error if no prices are found`, async () => {
            listPricesStub.resolves({ data: [] });
            const useCase = createUseCase();

            try {
              await useCase.execute(
                GetPricesCommand.create({
                  apiServiceLevel: apiServiceLevel,
                })
              );
            } catch (e) {
              expect(e.message).to.equal(
                `No price found for apiServiceLevel: '${apiServiceLevel}' and lookup_keys: '${prices}'`
              );
            }
          });
        });
      };
    })
    .forEach((test) => test());
});
