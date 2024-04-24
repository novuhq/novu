import { OrganizationRepository } from '@novu/dal';
import { processTestAgentExpectedStatusCode, UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('Update Branding Details - /organizations/branding (PUT)', function () {
  let session: UserSession;
  const organizationRepository = new OrganizationRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should update organization name only', async () => {
    const payload = {
      name: 'New Name',
    };

    await session.testAgent.patch('/v1/organizations').send(payload).expect(processTestAgentExpectedStatusCode(200));

    const organization = await organizationRepository.findById(session.organization._id);
    expect(organization?.name).to.equal(payload.name);
    expect(organization?.logo).to.equal(session.organization.logo);
  });

  it('should update the branding details', async function () {
    const payload = {
      color: '#fefefe',
      fontColor: '#f4f4f4',
      contentBackground: '#fefefe',
      fontFamily: 'Nunito',
      logo: 'https://s3.us-east-1.amazonaws.com/novu-app-bucket/2/1/3.png',
    };

    const result = await session.testAgent
      .put('/v1/organizations/branding')
      .send(payload)
      .expect(processTestAgentExpectedStatusCode(200));

    const organization = await organizationRepository.findById(session.organization._id);

    expect(organization?.branding.color).to.equal(payload.color);
    expect(organization?.branding.logo).to.equal(payload.logo);
    expect(organization?.branding.fontColor).to.equal(payload.fontColor);
    expect(organization?.branding.fontFamily).to.equal(payload.fontFamily);
    expect(organization?.branding.contentBackground).to.equal(payload.contentBackground);
  });

  it('logo should be an https protocol', async () => {
    const payload = {
      logo: 'http://s3.us-east-1.amazonaws.com/novu-app-bucket/2/1/3.png',
    };

    const result = await session.testAgent.put('/v1/organizations/branding').send(payload).expect(400);
  });

  ['png', 'jpg', 'jpeg', 'gif', 'svg'].forEach((extension) => {
    it(`should update if logo is a valid image URL with ${extension} extension`, async function () {
      const payload = {
        logo: `https://s3.us-east-1.amazonaws.com/novu-app-bucket/2/1/3.${extension}`,
      };

      const result = await session.testAgent
        .put('/v1/organizations/branding')
        .send(payload)
        .expect(processTestAgentExpectedStatusCode(200));
    });
  });

  ['exe', 'zip'].forEach((extension) => {
    it(`should fail to update if logo is a valid image URL with ${extension} extension`, async function () {
      const payload = {
        logo: `https://s3.us-east-1.amazonaws.com/novu-app-bucket/2/1/3.${extension}`,
      };

      const result = await session.testAgent.put('/v1/organizations/branding').send(payload).expect(400);
    });
  });
});
