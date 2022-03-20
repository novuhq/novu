import { MemberEntity, OrganizationRepository, MemberRepository } from '@notifire/dal';
import { UserSession } from '@notifire/testing';

import { MemberRoleEnum, MemberStatusEnum } from '@notifire/shared';
import { expect } from 'chai';
import { describe } from 'mocha';

describe('Remove organization member - /organizations/members/:memberId (DELETE)', async () => {
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

    user2.organization = session.organization;
    user3.organization = session.organization;
  });

  it('should remove the member by his id', async () => {
    const members: MemberEntity[] = await getOrganizationMembers();
    const user2Member = members.find((i) => i._userId === user2.user._id);

    const { body } = await session.testAgent.delete(`/v1/organizations/members/${user2Member._id}`).expect(200);

    expect(body.data._id).to.equal(user2Member._id);

    const membersAfterRemoval: MemberEntity[] = await getOrganizationMembers();
    const user2Removed = membersAfterRemoval.find((i) => i._userId === user2.user._id);

    expect(user2Removed).to.not.be.ok;
  });

  async function getOrganizationMembers() {
    const { body } = await session.testAgent.get('/v1/organizations/members');

    return body.data;
  }
});
