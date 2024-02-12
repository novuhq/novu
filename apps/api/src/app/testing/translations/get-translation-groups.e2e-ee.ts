import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('get translation groups - /translations/groups (GET)', async () => {
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
    await session.testAgent.post(`/v1/translations/groups`).send({
      name: 'test1',
      identifier: 'test1',
      locales: ['en_US', 'en_GB'],
    });
    await session.testAgent.post(`/v1/translations/groups`).send({
      name: 'test2',
      identifier: 'test2',
      locales: ['en_US', 'sv_SE'],
    });
  });

  it('should get translation groups', async () => {
    const data = await session.testAgent.get(`/v1/translations/groups`).send();
    const groups = data.body.data;

    const testGroup = groups[0];
    expect(testGroup.identifier).to.equal('test');
    expect(testGroup.name).to.equal('test');
    expect(testGroup.uiConfig.locales).to.deep.equal(['en_US']);
    expect(testGroup.uiConfig.localesMissingTranslations).to.deep.equal(['en_US']);

    const test1Group = groups[1];
    expect(test1Group.identifier).to.equal('test1');
    expect(test1Group.name).to.equal('test1');
    expect(test1Group.uiConfig.locales).to.deep.equal(['en_US', 'en_GB']);
    expect(test1Group.uiConfig.localesMissingTranslations).to.deep.equal(['en_US', 'en_GB']);

    const test2Group = groups[2];
    expect(test2Group.identifier).to.equal('test2');
    expect(test2Group.name).to.equal('test2');
    expect(test2Group.uiConfig.locales).to.deep.equal(['en_US', 'sv_SE']);
    expect(test2Group.uiConfig.localesMissingTranslations).to.deep.equal(['en_US', 'sv_SE']);
  });
});
