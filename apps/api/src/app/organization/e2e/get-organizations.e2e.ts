import { MemberRepository, OrganizationEntity } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { MemberRoleEnum } from '@novu/shared';

describe('Get organizations - /organizations (GET)', async () => {
  let session: UserSession;
  let otherSession: UserSession;
  let thirdSession: UserSession;

  let thirdOldOrganization: OrganizationEntity;

  const memberRepository = new MemberRepository();

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
            role: MemberRoleEnum.MEMBER,
          },
        ],
      })
      .expect(201);

    const members = await memberRepository.getOrganizationMembers(session.organization._id);
    const invitee = members.find((i) => !i._userId);

    thirdOldOrganization = thirdSession.organization;

    await thirdSession.testAgent.post(`/v1/invites/${invitee.invite.token}/accept`).expect(201);

    thirdSession.organization = session.organization;
    await thirdSession.fetchJWT();
  });

  it('should see all organizations that you are a part of', async () => {
    const { body } = await thirdSession.testAgent.get('/v1/organizations').expect(200);

    expect(JSON.stringify(body.data)).to.include(session.organization.name);
    expect(JSON.stringify(body.data)).to.include(thirdSession.organization.name);
    expect(JSON.stringify(body.data)).to.include(thirdOldOrganization.name);
    expect(JSON.stringify(body.data)).to.not.include(otherSession.organization.name);
  });
});
