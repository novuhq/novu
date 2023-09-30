import { MemberRepository, MemberEntity } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { MemberStatusEnum } from '@novu/shared';
import { expect } from 'chai';

describe('Resend invite - /invites/resend (POST)', async () => {
  let session: UserSession;
  let invitee: MemberEntity;
  const memberRepository = new MemberRepository();

  async function setup() {
    session = new UserSession();
    await session.initialize();

    await session.testAgent
      .post('/v1/invites/bulk')
      .send({
        invitees: [
          {
            email: 'asdas@dasdas.com',
          },
        ],
      })
      .expect(201);

    const members = await memberRepository.getOrganizationMembers(session.organization._id);
    invitee = members.find((i) => i.memberStatus === MemberStatusEnum.INVITED);
  }

  describe('Valid resend invite flow', async () => {
    before(async () => {
      await setup();

      const members = await memberRepository.getOrganizationMembers(session.organization._id);

      const invitedMember = members.find((i) => i.memberStatus === MemberStatusEnum.INVITED);

      const { body } = await session.testAgent
        .post('/v1/invites/resend')
        .send({ memberId: invitedMember._id })
        .expect(201);
    });

    it('should change the inviter id', async () => {
      const member = await memberRepository.findMemberById(session.organization._id, invitee._id);

      expect(member.invite._inviterId).to.equal(session.user._id);
    });
  });

  describe('Invalid accept requests handling', async () => {
    before(async () => {
      await setup();
    });

    it('should reject if member already active', async () => {
      expect(invitee.memberStatus).to.eq(MemberStatusEnum.INVITED);
      await memberRepository.update(
        { _organizationId: session.organization._id, _id: invitee._id },
        { memberStatus: MemberStatusEnum.ACTIVE }
      );

      const { body } = await session.testAgent.post('/v1/invites/resend').send({ memberId: invitee._id }).expect(400);

      expect(body.message).to.exist;
      expect(body.message).to.equal('Member already active');
      expect(body.error).to.equal('Bad Request');
    });

    it('should reject if member id invalid', async () => {
      expect(invitee.memberStatus).to.eq(MemberStatusEnum.INVITED);

      const { body } = await session.testAgent
        .post('/v1/invites/resend')
        .send({ memberId: '5fdedb7c25ab1352eef88f60' })
        .expect(400);

      expect(body.message.length).to.exist;
      expect(body.message).to.equal('Member not found');
      expect(body.error).to.equal('Bad Request');
    });
  });
});
