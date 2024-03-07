import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { OrganizationRepository } from '@novu/dal';

describe('Update default locale and add new translations - /translations/language (PATCH)', async () => {
  let session: UserSession;
  const organizationRepository = new OrganizationRepository();

  before(async () => {
    session = new UserSession();
    await session.initialize();
    await session.testAgent.put(`/v1/organizations/language`).send({
      locale: 'en_US',
    });
  });

  it('should update default locale and add that locale to groups', async () => {
    await session.testAgent.post(`/v1/translations/groups`).send({
      name: 'test',
      identifier: 'test',
      locales: ['en_US', 'sv_SE'],
    });

    await session.applyChanges({
      enabled: false,
    });

    await session.testAgent.patch(`/v1/translations/language`).send({
      locale: 'en_GB',
    });

    const org = await organizationRepository.findById(session.organization._id);
    expect(org?.defaultLocale).to.be.equal('en_GB');

    const result = await session.testAgent.get(`/v1/translations/groups/test`).send();
    let group = result.body.data;

    let locales = group.translations.map((t) => t.isoLanguage);

    expect(locales).to.deep.equal(['en_US', 'sv_SE', 'en_GB']);

    await session.applyChanges({
      enabled: false,
    });
    await session.switchToProdEnvironment();

    const data = await session.testAgent.get(`/v1/translations/groups/test`).send();
    group = data.body.data;
    locales = group.translations.map((t) => t.isoLanguage);
    expect(locales).to.deep.equal(['en_US', 'sv_SE', 'en_GB']);
  });
});
