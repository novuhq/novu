import { OrganizationRepository, MemberRepository, MemberEntity } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { MemberStatusEnum } from '@novu/shared';
import { expect } from 'chai';

describe('Resend invite - /invites/resend (POST)', async () => {
  let session: UserSession;
  let invitedUserSession: UserSession;
  let invitee: MemberEntity;
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

    const members = await memberRepository.getOrganizationMembers(session.organization._id);
    invitee = members.find((i) => i.memberStatus === MemberStatusEnum.INVITED);
  }

  describe('Valid resend invite flow', async () => {
    let response;

    before(async () => {
      await setup();

      const members = await memberRepository.getOrganizationMembers(session.organization._id);
      const invitee = members.find((i) => i.memberStatus === MemberStatusEnum.INVITED);

      const { body } = await invitedUserSession.testAgent
        .post('/v1/invites/resend', { memberId: invitee._id })
        .expect(201);

      response = body.data;
    });

    it('should change the inviter id', async () => {
      const member = await memberRepository.findMemberByUserId(session.organization._id, invitee._id);

      expect(member.invite._inviterId).to.equal(session.user._id);
    });
  });

  describe('Invalid accept requests handling', async () => {
    before(async () => {
      await setup();
    });

    it('should reject if member already active', async () => {
      expect(invitee.memberStatus).to.eq(MemberStatusEnum.INVITED);
      await memberRepository.update(invitee, { memberStatus: MemberStatusEnum.ACTIVE });

      expect(invitee.memberStatus).to.eq(MemberStatusEnum.ACTIVE);

      const { body } = await invitedUserSession.testAgent
        .post('/v1/invites/resend', { memberId: invitee._id })
        .expect(400);

      expect(body.message).to.contain('active');
    });

    it('should reject if member id invalid', async () => {
      expect(invitee.memberStatus).to.eq(MemberStatusEnum.INVITED);

      const { body } = await invitedUserSession.testAgent.post('/v1/invites/resend', { memberId: 123 }).expect(400);

      expect(body.message).to.contain('not found');
    });
  });
});
