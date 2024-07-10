import { MemberEntity, OrganizationRepository, MemberRepository, EnvironmentRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';

import { MemberRoleEnum, MemberStatusEnum } from '@novu/shared';
import { expect } from 'chai';
import { describe } from 'mocha';

describe('Remove organization member - /organizations/members/:memberId (DELETE)', async () => {
  let session: UserSession;
  const memberRepository = new MemberRepository();
  const environmentRepository = new EnvironmentRepository();
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

  it('should switch the apiKey association when api key creator removed', async function () {
    const members: MemberEntity[] = await getOrganizationMembers();
    const originalCreator = members.find((i) => i._userId === session.user._id);
    await user2.fetchJWT();

    expect(session.environment.apiKeys[0]._userId).to.equal(session.user._id);
    const { body } = await user2.testAgent.delete(`/v1/organizations/members/${originalCreator._id}`);
    expect(body.data._id).to.equal(originalCreator._id);

    const membersAfterRemoval: MemberEntity[] = await getOrganizationMembers(user2);
    const originalCreatorAfterRemoval = membersAfterRemoval.find((i) => i._userId === originalCreator.user._id);
    expect(originalCreatorAfterRemoval).to.not.be.ok;

    const environment = await environmentRepository.findOne({ _id: session.environment._id });
    expect(environment.apiKeys[0]._userId).to.not.equal(session.user._id);
  });

  it('should remove the member by his id', async () => {
    const members: MemberEntity[] = await getOrganizationMembers();
    const user2Member = members.find((i) => i._userId === user2.user._id);

    const { body } = await session.testAgent.delete(`/v1/organizations/members/${user2Member._id}`).expect(200);

    expect(body.data._id).to.equal(user2Member._id);

    const membersAfterRemoval: MemberEntity[] = await getOrganizationMembers();
    const user2Removed = membersAfterRemoval.find((i) => i._userId === user2.user._id);

    expect(user2Removed).to.not.be.ok;

    /**
     * The API Key owner should not be updated if non creator was removed
     */
    const environment = await environmentRepository.findOne({ _id: session.environment._id });
    expect(environment.apiKeys[0]._userId).to.equal(session.user._id);
  });

  async function getOrganizationMembers(sessionToUser = session) {
    const { body } = await sessionToUser.testAgent.get('/v1/organizations/members');

    return body.data;
  }
});
