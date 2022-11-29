import { MemberEntity, OrganizationRepository, MemberRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { MemberRoleEnum, MemberStatusEnum } from '@novu/shared';
import { expect } from 'chai';
import { describe } from 'mocha';

describe('Get Organization members - /organizations/members (GET)', async () => {
  let session: UserSession;
  const organizationRepository = new OrganizationRepository();
  const memberRepository = new MemberRepository();
  let user2: UserSession;
  let user3: UserSession;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();

    user2 = new UserSession();
    await user2.initialize({
      noOrganization: true,
    });

    user3 = new UserSession();
    await user3.initialize({
      noOrganization: true,
    });
  });

  it('should return all organization members', async () => {
    await memberRepository.addMember(session.organization._id, {
      _userId: user2.user._id,
      invite: null,
      roles: [MemberRoleEnum.ADMIN],
      memberStatus: MemberStatusEnum.ACTIVE,
    });

    await memberRepository.addMember(session.organization._id, {
      _userId: user3.user._id,
      invite: null,
      roles: [MemberRoleEnum.ADMIN],
      memberStatus: MemberStatusEnum.ACTIVE,
    });

    const { body } = await session.testAgent.get('/v1/organizations/members');

    const response: MemberEntity[] = body.data;

    expect(response.length).to.equal(3);
    const user2Member = response.find((i) => i._userId === user2.user._id);

    expect(user2Member).to.be.ok;
    expect(user2Member.memberStatus).to.equal(MemberStatusEnum.ACTIVE);
    expect(user2Member.user).to.be.ok;
    expect(user2Member.user.firstName).to.equal(user2.user.firstName);
    expect(user2Member.user.email).to.equal(user2.user.email);
  });
});
