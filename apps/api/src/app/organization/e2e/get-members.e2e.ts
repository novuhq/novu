import { CommunityMemberRepository } from '@novu/dal';
import { MemberRoleEnum, MemberStatusEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('Get members - /organization/members (GET) #novu-v0-os', async () => {
  let session: UserSession;
  let otherSession: UserSession;

  const memberRepository = new CommunityMemberRepository();

  before(async () => {
    session = new UserSession();
    await session.initialize();

    otherSession = new UserSession();
    await otherSession.initialize({
      noOrganization: true,
    });

    await memberRepository.addMember(session.organization._id, {
      _userId: otherSession.user._id,
      roles: [MemberRoleEnum.OSS_ADMIN],
      memberStatus: MemberStatusEnum.ACTIVE,
    });

    otherSession.organization = session.organization;
    await otherSession.fetchJWT();
  });

  it('should see emails of all members as admin', async () => {
    const { body } = await session.testAgent.get('/v1/organizations/members').expect(200);

    expect(JSON.stringify(body.data)).to.include(otherSession.user.email);
    expect(JSON.stringify(body.data)).to.include(session.user.firstName);
  });
});
