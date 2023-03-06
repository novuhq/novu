import { MemberRepository, MemberEntity } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { MemberStatusEnum } from '@novu/shared';
import { expect } from 'chai';

describe('Accept invite - /invites/:inviteToken/accept (POST)', async () => {
  let session: UserSession;
  let invitedUserSession: UserSession;
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
    before(async () => {
      await setup();

      const members = await memberRepository.getOrganizationMembers(session.organization._id);
      const invitee = members.find((i) => !i._userId);

      await invitedUserSession.testAgent.post(`/v1/invites/${invitee.invite.token}/accept`).expect(201);
    });

    it('should change the member status to active', async () => {
      const member = await memberRepository.findMemberByUserId(session.organization._id, invitedUserSession.user._id);

      expect(member?._userId).to.equal(invitedUserSession.user._id);
      expect(member?.memberStatus).to.equal(MemberStatusEnum.ACTIVE);
    });

    it('should invite existing user instead of creating new user', async () => {
      const thirdUserSession = new UserSession();
      await thirdUserSession.initialize();

      const inviteeMembers = await memberRepository.find({
        _organizationId: session.organization._id,
        _userId: invitedUserSession.user._id,
      });
      expect(inviteeMembers.length).to.eq(1);

      await thirdUserSession.testAgent.post('/v1/invites/bulk').send({
        invitees: [
          {
            email: invitedUserSession.user.email,
          },
        ],
      });

      const members = await memberRepository.getOrganizationMembers(thirdUserSession.organization._id);
      const newInvitee = members.find(
        (member) => member.invite && member.invite.email === invitedUserSession.user.email
      );
      expect(newInvitee).to.exist;

      const { body } = await invitedUserSession.testAgent.get(`/v1/invites/${newInvitee.invite.token}`).expect(200);
      expect(body.data.email).to.eq(invitedUserSession.user.email);

      await invitedUserSession.testAgent.post(`/v1/invites/${newInvitee.invite.token}/accept`).expect(201);

      const newInviteeMembers = await memberRepository.find({
        _userId: invitedUserSession.user._id,
      } as MemberEntity & { _organizationId: string });

      expect(newInviteeMembers.length).to.eq(2);
    });
  });

  describe('Invalid accept requests handling', async () => {
    before(async () => {
      await setup();
    });

    it('should reject expired token', async () => {
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
