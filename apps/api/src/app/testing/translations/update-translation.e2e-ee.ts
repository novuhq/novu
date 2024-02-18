import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('Update translation - /translations/groups (PATCH)', async () => {
  let session: UserSession;

  before(async () => {
    session = new UserSession();
    await session.initialize();
    await session.testAgent.put(`/v1/organizations/language`).send({
      locale: 'en_US',
    });
  });

  it('should update translation', async () => {
    await session.testAgent.post(`/v1/translations/groups`).send({
      name: 'test',
      identifier: 'test',
      locales: ['en_US', 'sv_SE'],
    });

    await session.applyChanges({
      enabled: false,
    });

    let result = await session.testAgent.patch(`/v1/translations/groups/test`).send({
      name: 'test1',
      identifier: 'test1',
      locales: ['en_US', 'en_GB'],
    });

    let group = result.body.data;

    let locales = group.translations.map((t) => t.isoLanguage);

    expect(group.identifier).to.equal('test1');
    expect(group.name).to.equal('test1');
    expect(locales).to.deep.equal(['en_US', 'en_GB']);

    result = await session.testAgent.get(`/v1/translations/groups/test1/locales/sv_SE`).send();

    expect(result.body.message).to.equal('Translation could not be found');
    expect(result.body.error).to.equal('Not Found');
    expect(result.body.statusCode).to.equal(404);

    await session.applyChanges({
      enabled: false,
    });
    await session.switchToProdEnvironment();

    const data = await session.testAgent.get(`/v1/translations/groups/test1`).send();
    group = data.body.data;
    locales = group.translations.map((t) => t.isoLanguage);
    expect(group.identifier).to.equal('test1');
    expect(group.name).to.equal('test1');
    expect(locales).to.deep.equal(['en_US', 'en_GB']);
  });
});
