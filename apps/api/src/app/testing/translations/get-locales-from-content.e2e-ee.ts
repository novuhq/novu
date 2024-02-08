import { UserSession } from '@novu/testing';
import { expect } from 'chai';

const createTranslationGroup = {
  name: 'test',
  identifier: 'test',
  locales: ['hi_IN', 'en_US'],
};

const content = 'Hello {{i18n "test.key1"}}, {{i18n "test.key2"}}, {{i18n "test.key3"}}';

describe('Get locales from content - /translations/groups/:identifier/locales/:locale (PATCH)', async () => {
  let session: UserSession;

  before(async () => {
    session = new UserSession();
    await session.initialize();
    await session.testAgent.put(`/v1/organizations/language`).send({
      locale: createTranslationGroup.locales[0],
    });

    await session.testAgent.post('/v1/translations/groups').send(createTranslationGroup);
  });

  it('should get locales from the content', async () => {
    const { body } = await session.testAgent.post('/v1/translations/groups/preview/locales').send({
      content,
    });

    const locales = body.data;

    expect(locales.length).to.equal(2);
    expect(locales[0].langIso).to.equal(createTranslationGroup.locales[0]);
    expect(locales[1].langIso).to.equal(createTranslationGroup.locales[1]);
  });
});
