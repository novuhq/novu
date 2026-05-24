import {
  CommunityMemberRepository,
  CommunityOrganizationRepository,
  OrganizationEntity,
  PartnerTypeEnum,
} from '@novu/dal';
import { MemberRoleEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('Get organizations - /organizations (GET) #novu-v0-os', async () => {
  let session: UserSession;
  let otherSession: UserSession;
  let thirdSession: UserSession;

  let thirdOldOrganization: OrganizationEntity;

  const memberRepository = new CommunityMemberRepository();
  const organizationRepository = new CommunityOrganizationRepository();

  before(async () => {
    session = new UserSession();
    await session.initialize();

    otherSession = new UserSession();
    await otherSession.initialize();

    thirdSession = new UserSession();
    await thirdSession.initialize();

    await session.testAgent
      .post('/v1/invites/bulk')
      .send({
        invitees: [
          {
            email: 'dddd@asdas.com',
            role: MemberRoleEnum.OSS_MEMBER,
          },
        ],
      })
      .expect(201);

    const members = await memberRepository.getOrganizationMembers(session.organization._id);
    const invitee = members.find((i) => !i._userId);

    thirdOldOrganization = thirdSession.organization;

    await thirdSession.testAgent.post(`/v1/invites/${invitee.invite.token}/accept`).expect(201);
  });

  it('should see all organizations that you are a part of', async () => {
    const { body } = await thirdSession.testAgent.get('/v1/organizations').expect(200);

    expect(JSON.stringify(body.data)).to.include(session.organization.name);
    expect(JSON.stringify(body.data)).to.include(thirdSession.organization.name);
    expect(JSON.stringify(body.data)).to.include(thirdOldOrganization.name);
    expect(JSON.stringify(body.data)).to.not.include(otherSession.organization.name);
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

    const { body } = await thirdSession.testAgent.get('/v1/organizations').expect(200);
    const organization = body.data.find((item: { _id: string }) => item._id === session.organization._id);

    expect(organization.partnerConfigurations?.[0]).to.not.have.property('accessToken');
    expect(JSON.stringify(body.data)).to.not.include('secret-vercel-token');
  });
});
