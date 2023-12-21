import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('Delete a Transaltion group - /translations/group/:id (Delete)', async () => {
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
    expect(translationGroupList.data[0].name).to.equal('test');
    expect(translationGroupList.data[0].identifier).to.equal('test');
    expect(translationGroupList.data[0].uiConfig.locales).to.eql(['hi_IN']);
    expect(translationGroupList.data[0]._id).to.equal(newTranslationGroupdId);

    await session.testAgent.delete(`/v1/translations/groups/${createTranslationGroup.identifier}`).send();

    const { body: translationGroupListAfterDelete } = await session.testAgent.get('/v1/translations/groups').send();
    expect(translationGroupListAfterDelete.data.length).to.equal(0);
  });
});
