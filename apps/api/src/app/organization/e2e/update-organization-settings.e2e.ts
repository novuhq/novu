import { CommunityOrganizationRepository } from '@novu/dal';
import { ApiServiceLevelEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('Update Organization Settings - /organizations/settings (PATCH) #novu-v2', () => {
  let session: UserSession;
  let organizationRepository: CommunityOrganizationRepository;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    organizationRepository = new CommunityOrganizationRepository();
  });

  it('should allow updating removeNovuBranding for PRO tier organizations', async () => {
    await organizationRepository.update(
      { _id: session.organization._id },
      { apiServiceLevel: ApiServiceLevelEnum.PRO }
    );

    const payload = { removeNovuBranding: true };

    const { body } = await session.testAgent.patch('/v1/organizations/settings').send(payload).expect(200);

    expect(body.data.removeNovuBranding).to.equal(true);
  });

  it('should block branding updates for free tier organizations', async () => {
    await organizationRepository.update(
      { _id: session.organization._id },
      { apiServiceLevel: ApiServiceLevelEnum.FREE }
    );

    const payload = { removeNovuBranding: true };

    const { body } = await session.testAgent.patch('/v1/organizations/settings').send(payload).expect(402);

    expect(body.message).to.include('Removing Novu branding is not allowed on the free plan');
  });

  it('should allow free tier organizations to call endpoint without branding changes', async () => {
    await organizationRepository.update(
      { _id: session.organization._id },
      { apiServiceLevel: ApiServiceLevelEnum.FREE }
    );

    const payload = {};

    const { body } = await session.testAgent.patch('/v1/organizations/settings').send(payload).expect(200);

    expect(body.data).to.have.property('removeNovuBranding');
    expect(typeof body.data.removeNovuBranding).to.equal('boolean');
  });
});
