import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('Create translation group - /translations/groups (POST)', async () => {
  let session: UserSession;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    await session.testAgent.put(`/v1/organizations/language`).send({
      locale: 'en_US',
    });
  });

  it('should create translation group', async () => {
    const result = await session.testAgent.post(`/v1/translations/groups`).send({
      name: 'test',
      identifier: 'test',
      locales: ['en_US'],
    });

    let group = result.body.data;
    const id = group.id;

    expect(group.name).to.eq('test');
    expect(group.identifier).to.eq('test');

    let data = await session.testAgent.get(`/v1/translations/groups/test`).send();
    group = data.body.data;
    let locales = group.translations.map((t) => t.isoLanguage);

    expect(group.name).to.eq('test');
    expect(group.identifier).to.eq('test');
    expect(locales).to.deep.eq(['en_US']);
    expect(id).to.equal(group.id);
    await session.applyChanges({
      enabled: false,
    });
    await session.switchToProdEnvironment();

    data = await session.testAgent.get(`/v1/translations/groups/test`).send();
    group = data.body.data;
    locales = group.translations.map((t) => t.isoLanguage);
    expect(group.name).to.eq('test');
    expect(group.identifier).to.eq('test');
    expect(locales).to.deep.eq(['en_US']);
  });
  it('should promote creation of default locale translation after translation group promotion', async () => {
    const result = await session.testAgent.post(`/v1/translations/groups`).send({
      name: 'test',
      identifier: 'test',
      locales: ['en_US', 'sv_SE'],
    });

    let group = result.body.data;
    const id = group.id;

    expect(group.name).to.eq('test');
    expect(group.identifier).to.eq('test');

    let data = await session.testAgent.get(`/v1/translations/groups/test`).send();
    group = data.body.data;
    let locales = group.translations.map((t) => t.isoLanguage);

    expect(group.name).to.eq('test');
    expect(group.identifier).to.eq('test');
    expect(locales).to.deep.eq(['en_US', 'sv_SE']);
    expect(id).to.equal(group.id);

    await session.applyChanges({
      enabled: false,
      _entityId: group.id,
    });
    await session.switchToProdEnvironment();

    data = await session.testAgent.get(`/v1/translations/groups/test`).send();
    group = data.body.data;
    locales = group.translations.map((t) => t.isoLanguage);
    expect(group.name).to.eq('test');
    expect(group.identifier).to.eq('test');
    expect(locales).to.deep.eq(['en_US']);
  });

  it('should check that default locale is included in group else add it', async () => {
    const result = await session.testAgent.post(`/v1/translations/groups`).send({
      name: 'test',
      identifier: 'test1',
      locales: ['en_GB'],
    });
    const data = await session.testAgent.get(`/v1/translations/groups/test1`).send();
    const group = data.body.data;
    const locales = group.translations.map((t) => t.isoLanguage);
    expect(locales).to.deep.eq(['en_US', 'en_GB']);
  });

  it('should check that locale is allowed', async () => {
    const result = await session.testAgent.post(`/v1/translations/groups`).send({
      name: 'test',
      identifier: 'test',
      locales: ['en_US', 'test'],
    });

    expect(result.body.message).to.be.eq('Locale could not be found');
    expect(result.body.statusCode).to.be.eq(404);
    expect(result.body.error).to.be.eq('Not Found');
  });
});
