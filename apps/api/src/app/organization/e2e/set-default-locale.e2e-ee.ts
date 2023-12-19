import { OrganizationRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('Set default locale for organization - /organizations (POST)', async () => {
  let session: UserSession;
  const organizationRepository = new OrganizationRepository();

  before(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should set default locale for organization', async () => {
    let org = await organizationRepository.findById(session.organization._id);
    expect(org?.defaultLocale).to.be.equal(undefined);

    let result = await session.testAgent.put(`/v1/organizations/language`).send({
      locale: 'en_US',
    });
    expect(result.body.data.defaultLocale).to.eq('en_US');
    org = await organizationRepository.findById(session.organization._id);
    expect(org?.defaultLocale).to.be.equal('en_US');

    result = await session.testAgent.put(`/v1/organizations/language`).send({
      locale: 'en_GB',
    });
    expect(result.body.data.defaultLocale).to.eq('en_GB');
    org = await organizationRepository.findById(session.organization._id);
    expect(org?.defaultLocale).to.be.equal('en_GB');
  });
});
