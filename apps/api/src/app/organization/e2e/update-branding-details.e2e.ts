import { OrganizationRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('Update Branding Details - /organizations/branding (PUT)', function () {
  let session: UserSession;
  const organizationRepository = new OrganizationRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should update the branding details', async function () {
    const payload = {
      color: '#fefefe',
      fontColor: '#f4f4f4',
      contentBackground: '#fefefe',
      fontFamily: 'Nunito',
      logo: 'https://st.depositphotos.com/1186248/2404/i/600/depositphotos_24043595-stock-photo-fake-rubber-stamp.jpg',
    };

    await session.testAgent.put('/v1/organizations/branding').send(payload);

    const organization = await organizationRepository.findById(session.organization._id);

    expect(organization.branding.color).to.equal(payload.color);
    expect(organization.branding.logo).to.equal(payload.logo);
    expect(organization.branding.fontColor).to.equal(payload.fontColor);
    expect(organization.branding.fontFamily).to.equal(payload.fontFamily);
    expect(organization.branding.contentBackground).to.equal(payload.contentBackground);
  });
});
