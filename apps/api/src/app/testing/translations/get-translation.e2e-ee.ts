import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('GET translation - /translations/groups/:identifier/locales/:locale (GET)', async () => {
  let session: UserSession;

  before(async () => {
    session = new UserSession();
    await session.initialize();
    await session.testAgent.put(`/v1/organizations/language`).send({
      locale: 'en_US',
    });
  });

  it('should get translation', async () => {
    let result = await session.testAgent.post(`/v1/translations/groups`).send({
      name: 'test',
      identifier: 'test',
      locales: ['en_US', 'sv_SE'],
    });

    const group = result.body.data;

    result = await session.testAgent.get(`/v1/translations/groups/test/locales/sv_SE`).send();

    const translation = result.body.data;

    expect(translation.isoLanguage).to.equal('sv_SE');
    expect(translation._groupId).to.equal(group.id);
  });
});
