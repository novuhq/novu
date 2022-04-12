import { OrganizationRepository, MemberRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { MemberStatusEnum } from '@novu/shared';
import { expect } from 'chai';

describe('Accept invite - /invites/:inviteToken/accept (POST)', async () => {
  let session: UserSession;
  let invitedUserSession: UserSession;
  const organizationRepository = new OrganizationRepository();
  const memberRepository = new MemberRepository();

  async function setup() {
    session = new UserSession();
    invitedUserSession = new UserSession();
    await invitedUserSession.initialize({
      noOrganization: true,
      noEnvironment: true,
    });

    await session.initialize();

    await session.testAgent.post('/v1/invites/bulk').send({
      invitees: [
        {
          email: 'asdas@dasdas.com',
        },
      ],
    });
  }

  describe('Valid invite accept flow', async () => {
    let response;

    before(async () => {
      await setup();

      const organization = await organizationRepository.findById(session.organization._id);
      const members = await memberRepository.getOrganizationMembers(session.organization._id);
      const invitee = members.find((i) => !i._userId);

      const { body } = await invitedUserSession.testAgent
        .post(`/v1/invites/${invitee.invite.token}/accept`)
        .expect(201);

      response = body.data;
    });

    it('should change the member status to active', async () => {
      const member = await memberRepository.findMemberByUserId(session.organization._id, invitedUserSession.user._id);

      expect(member._userId).to.equal(invitedUserSession.user._id);
      expect(member.memberStatus).to.equal(MemberStatusEnum.ACTIVE);
    });
  });

  describe('Invalid accept requests handling', async () => {
    before(async () => {
      await setup();
    });

    it('should reject expired token', async () => {
      const organization = await organizationRepository.findById(session.organization._id);
      const members = await memberRepository.getOrganizationMembers(session.organization._id);
      const invitee = members.find((i) => !i._userId);

      expect(invitee.memberStatus).to.eq(MemberStatusEnum.INVITED);

      await invitedUserSession.testAgent.post(`/v1/invites/${invitee.invite.token}/accept`).expect(201);

      const { body } = await invitedUserSession.testAgent
        .post(`/v1/invites/${invitee.invite.token}/accept`)
        .expect(400);

      expect(body.message).to.contain('expired');
    });
  });
});
