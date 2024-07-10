import { OrganizationRepository, MemberRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { IBulkInviteResponse, MemberRoleEnum, MemberStatusEnum } from '@novu/shared';
import { expect } from 'chai';

describe('Bulk invite members - /invites/bulk (POST)', async () => {
  let session: UserSession;
  const organizationRepository = new OrganizationRepository();
  const memberRepository = new MemberRepository();

  before(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should fail without passing invitees', async () => {
    const { body } = await session.testAgent
      .post('/v1/invites/bulk')
      .send({
        invitees: [],
      })
      .expect(400);
  });

  it('should fail with bad emails', async () => {
    const { body } = await session.testAgent
      .post('/v1/invites/bulk')
      .send({
        invitees: [
          {
            email: 'email@bad',
            role: 'admin',
          },
        ],
      })
      .expect(400);
  });

  it('should invite member as admin', async () => {
    session = new UserSession();
    await session.initialize();

    const { body } = await session.testAgent
      .post('/v1/invites/bulk')
      .send({
        invitees: [
          {
            email: 'dddd@asdas.com',
            role: 'admin',
          },
        ],
      })
      .expect(201);

    const members = await memberRepository.getOrganizationMembers(session.organization._id);

    expect(members.length).to.eq(2);

    const member = members.find((i) => !i._userId);

    expect(member.invite.email).to.equal('dddd@asdas.com');
    expect(member.invite._inviterId).to.equal(session.user._id);
    expect(member.roles.length).to.equal(1);
    expect(member.roles[0]).to.equal(MemberRoleEnum.ADMIN);
    expect(member.memberStatus).to.equal(MemberStatusEnum.INVITED);
  });

  describe('send valid invites', () => {
    let inviteResponse: IBulkInviteResponse[];

    const invitee = {
      email: 'asdasda@asdas.com',
      role: 'admin',
    };

    before(async () => {
      session = new UserSession();
      await session.initialize();

      const { body } = await session.testAgent
        .post('/v1/invites/bulk')
        .send({
          invitees: [invitee],
        })
        .expect(201);

      inviteResponse = body.data;
    });

    it('should return a matching response', async () => {
      expect(inviteResponse.length).to.equal(1);
      expect(inviteResponse[0].success).to.equal(true);
      expect(inviteResponse[0].email).to.equal(invitee.email);
    });

    it('should create invited member entity', async () => {
      const members = await memberRepository.getOrganizationMembers(session.organization._id);

      expect(members.length).to.eq(2);

      const member = members.find((i) => !i._userId);

      expect(member.invite.email).to.equal(invitee.email);
      expect(member.invite._inviterId).to.equal(session.user._id);
      expect(member.roles.length).to.equal(1);
      expect(member.roles[0]).to.equal(MemberRoleEnum.ADMIN);

      expect(member.memberStatus).to.equal(MemberStatusEnum.INVITED);
      expect(member._userId).to.be.not.ok;
    });

    it('should fail invite already invited person', async () => {
      const { body } = await session.testAgent.post('/v1/invites/bulk').send({
        invitees: [invitee],
      });

      expect(body.data.length).to.equal(1);
      expect(body.data[0].failReason).to.include('Already invited');
      expect(body.data[0].success).to.equal(false);
    });
  });
});
