import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('get translation group - /translations/groups/:identifier (GET)', async () => {
  let session: UserSession;

  before(async () => {
    session = new UserSession();
    await session.initialize();
    await session.testAgent.put(`/v1/organizations/language`).send({
      locale: 'en_US',
    });
    await session.testAgent.post(`/v1/translations/groups`).send({
      name: 'test',
      identifier: 'test',
      locales: ['en_US'],
    });
  });

  it('should get translation group', async () => {
    const data = await session.testAgent.get(`/v1/translations/groups/test`).send();
    const group = data.body.data;
    const locales = group.translations.map((t) => t.isoLanguage);

    expect(group.name).to.eq('test');
    expect(group.identifier).to.eq('test');
    expect(locales).to.deep.eq(['en_US']);
  });

  it('should return 404 on trying getting a translation group that does not exist', async () => {
    const data = await session.testAgent.get(`/v1/translations/groups/hej`).send();
    const result = data.body;

    expect(result.message).to.equal('Group could not be found');
    expect(result.statusCode).to.be.eq(404);
    expect(result.error).to.be.eq('Not Found');
  });
});
