import { CommunityOrganizationRepository, PartnerTypeEnum } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('Get my organization - /organizations/me (GET) #novu-v0-os', async () => {
  let session: UserSession;
  let organizationRepository: CommunityOrganizationRepository;

  before(async () => {
    session = new UserSession();
    await session.initialize();
    organizationRepository = new CommunityOrganizationRepository();
  });

  describe('Get organization profile', () => {
    it('should return the correct organization', async () => {
      const { body } = await session.testAgent.get('/v1/organizations/me').expect(200);

      expect(body.data._id).to.eq(session.organization._id);
    });

    it('should not expose partner integration access tokens', async () => {
      await organizationRepository.update(
        { _id: session.organization._id },
        {
          partnerConfigurations: [
            {
              accessToken: 'secret-vercel-token',
              configurationId: 'config-id',
              teamId: 'team-id',
              partnerType: PartnerTypeEnum.VERCEL,
              projectIds: ['project-id'],
            },
          ],
        }
      );

      const { body } = await session.testAgent.get('/v1/organizations/me').expect(200);

      expect(body.data.partnerConfigurations?.[0]).to.not.have.property('accessToken');
      expect(JSON.stringify(body.data)).to.not.include('secret-vercel-token');
    });
  });
});
