import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('Delete a Translation group - /translations/group/:id (Delete)', async () => {
  let session: UserSession;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();

    await session.testAgent.put(`/v1/organizations/language`).send({
      locale: 'hi_IN',
    });
  });

  it('should delete the translation group', async function () {
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

    await session.testAgent.delete(`/v1/translations/groups/${createTranslationGroup.identifier}`).send();

    const { body: translationGroupListAfterDelete } = await session.testAgent.get('/v1/translations/groups').send();
    expect(translationGroupListAfterDelete.data.length).to.equal(0);
  });

  it('should also delete the translations of the group', async function () {
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

    const { body: translationGroup } = await session.testAgent
      .get(`/v1/translations/groups/${createTranslationGroup.identifier}`)
      .send();
    expect(translationGroup.data.name).to.equal(createTranslationGroup.name);
    expect(translationGroup.data.identifier).to.equal(createTranslationGroup.identifier);
    expect(translationGroup.data.translations.length).to.equal(1);
    expect(translationGroup.data.translations[0].isoLanguage).to.equal(createTranslationGroup.locales[0]);

    await session.testAgent.delete(`/v1/translations/groups/${createTranslationGroup.identifier}`).send();

    const { body: translationGroupListAfterDelete } = await session.testAgent.get('/v1/translations/groups').send();
    expect(translationGroupListAfterDelete.data.length).to.equal(0);

    const { body: translationGroupAfterDelete } = await session.testAgent
      .get(`/v1/translations/groups/${createTranslationGroup.identifier}`)
      .send();

    expect(translationGroupAfterDelete.statusCode).to.equal(404);
    expect(translationGroupAfterDelete.message).to.equal('Group could not be found');
  });
});
