import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('Delete a Translation - /translations/group/:id/locale/:locale (Delete)', async () => {
  let session: UserSession;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();

    await session.testAgent.put(`/v1/organizations/language`).send({
      locale: 'hi_IN',
    });
  });

  it('should delete the translation file', async function () {
    const createTranslationGroup = {
      name: 'test',
      identifier: 'test',
      locales: ['hi_IN'],
    };

    const { body } = await session.testAgent.post('/v1/translations/groups').send(createTranslationGroup);
    const newTranslationGroupId = body.data._id;
    const { body: translationGroupList } = await session.testAgent.get('/v1/translations/groups').send();
    expect(translationGroupList.data.length).to.equal(1);
    expect(translationGroupList.data[0].name).to.equal(createTranslationGroup.name);
    expect(translationGroupList.data[0].identifier).to.equal(createTranslationGroup.identifier);
    expect(translationGroupList.data[0].uiConfig.locales).to.eql(createTranslationGroup.locales);
    expect(translationGroupList.data[0]._id).to.equal(newTranslationGroupId);

    const jsonContent = {
      key1: 'value1',
      key2: 'value2',
    };

    const buffer = Buffer.from(JSON.stringify(jsonContent));

    const file = {
      fieldname: 'test.json',
      originalname: 'test.json',
      encoding: 'utf-8',
      mimetype: 'application/json',
      size: 123,
      buffer,
    };

    const fileBuffer = Buffer.from(JSON.stringify(file), 'utf-8');

    await session.testAgent
      .post(`/v1/translations/groups/${createTranslationGroup.identifier}`)
      .attach('files', fileBuffer, 'test.json')
      .field('locales', JSON.stringify(createTranslationGroup.locales))
      .field('identifier', createTranslationGroup.identifier);

    const { body: translation } = await session.testAgent
      .get(`/v1/translations/groups/${createTranslationGroup.identifier}/locales/${createTranslationGroup.locales[0]}`)
      .send();

    const translationData = translation.data;
    expect(translationData.isoLanguage).to.equal(createTranslationGroup.locales[0]);
    expect(translationData._groupId).to.equal(newTranslationGroupId);
    expect(translationData.translations).to.equal(JSON.stringify(file));

    await session.applyChanges({
      enabled: false,
    });
    await session.switchToProdEnvironment();

    const { body: translationProd } = await session.testAgent
      .get(`/v1/translations/groups/${createTranslationGroup.identifier}/locales/${createTranslationGroup.locales[0]}`)
      .send();

    const translationProdData = translationProd.data;
    expect(translationProdData.isoLanguage).to.equal(createTranslationGroup.locales[0]);
    expect(translationProdData.translations).to.equal(JSON.stringify(file));

    await session.switchToDevEnvironment();

    await session.testAgent
      .delete(
        `/v1/translations/groups/${createTranslationGroup.identifier}/locales/${createTranslationGroup.locales[0]}`
      )
      .send();

    const { body: translationAfterDelete } = await session.testAgent
      .get(`/v1/translations/groups/${createTranslationGroup.identifier}/locales/${createTranslationGroup.locales[0]}`)
      .send();

    const translationDataAfterDelete = translationAfterDelete.data;

    expect(translationDataAfterDelete.isoLanguage).to.equal(createTranslationGroup.locales[0]);
    expect(translationDataAfterDelete._groupId).to.equal(newTranslationGroupId);
    expect(translationDataAfterDelete.translations).to.not.exist;
    expect(translationDataAfterDelete.fileName).to.not.exist;

    await session.applyChanges({
      enabled: false,
    });

    await session.switchToProdEnvironment();

    const { body: translationProdAfterDelete } = await session.testAgent
      .get(`/v1/translations/groups/${createTranslationGroup.identifier}/locales/${createTranslationGroup.locales[0]}`)
      .send();

    const translationProdDataAfterDelete = translationProdAfterDelete.data;
    expect(translationProdDataAfterDelete.isoLanguage).to.equal(createTranslationGroup.locales[0]);
    expect(translationProdDataAfterDelete.translations).to.not.exist;
  });
});
