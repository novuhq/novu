import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('get locales - /translations/locales (GET)', async () => {
  let session: UserSession;

  before(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should get locales', async () => {
    const data = await session.testAgent.get(`/v1/translations/locales`).send();
    const locales: any[] = data.body.data;

    expect(locales.length).to.equal(482);
    expect(Object.keys(locales[0])).to.deep.equal([
      'name',
      'officialName',
      'numeric',
      'alpha2',
      'alpha3',
      'currencyName',
      'currencyAlphabeticCode',
      'langName',
      'langIso',
    ]);
  });
});
