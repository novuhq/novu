import { UserSession } from '@novu/testing';
import { expect } from 'chai';

const createTranslationGroup = {
  name: 'test',
  identifier: 'test',
  locales: ['hi_IN'],
};

describe('Edit translation - /translations/groups/:identifier/locales/:locale (PATCH)', async () => {
  let session: UserSession;

  before(async () => {
    session = new UserSession();
    await session.initialize();
    await session.testAgent.put(`/v1/organizations/language`).send({
      locale: createTranslationGroup.locales[0],
    });
  });

  it('should edit translation', async () => {
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

    const editedFileName = 'edited.json';
    const editedFileText = {
      key1: 'value1',
      key2: 'value2',
      key3: 'value3',
    };

    const { body: editTranslationBody } = await session.testAgent
      .patch(
        `/v1/translations/groups/${createTranslationGroup.identifier}/locales/${createTranslationGroup.locales[0]}`
      )
      .send({
        translation: JSON.stringify(editedFileText),
        fileName: editedFileName,
      });

    const editTranslation = editTranslationBody.data;

    expect(editTranslation.isoLanguage).to.equal(createTranslationGroup.locales[0]);
    expect(editTranslation._groupId).to.equal(newTranslationGroupId);
    expect(editTranslation.translations).to.equal(JSON.stringify(editedFileText));
    expect(editTranslation.fileName).to.equal(editedFileName);

    await session.applyChanges({
      enabled: false,
    });
    await session.switchToProdEnvironment();

    const { body: editTranslationProdBody } = await session.testAgent
      .get(`/v1/translations/groups/${createTranslationGroup.identifier}/locales/${createTranslationGroup.locales[0]}`)
      .send();

    const editTranslationProd = editTranslationProdBody.data;

    expect(editTranslationProd.isoLanguage).to.equal(createTranslationGroup.locales[0]);

    expect(editTranslationProd.fileName).to.equal(editedFileName);
    expect(editTranslationProd.translations).to.equal(JSON.stringify(editedFileText));
  });
});
