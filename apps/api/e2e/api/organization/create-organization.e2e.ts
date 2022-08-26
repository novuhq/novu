import { MemberRepository, OrganizationRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { MemberRoleEnum } from '@novu/shared';
import { expect } from 'chai';

describe('Create Organization - /organizations (POST)', async () => {
  let session: UserSession;
  const organizationRepository = new OrganizationRepository();
  const memberRepository = new MemberRepository();

  before(async () => {
    session = new UserSession();
    await session.initialize({
      noOrganization: true,
    });
  });

  describe('Valid Creation', () => {
    it('should add the user as admin', async () => {
      const { body } = await session.testAgent
        .post('/v1/organizations')
        .send({
          name: 'Test Org 2',
        })
        .expect(201);
      const dbOrganization = await organizationRepository.findById(body.data._id);

      const members = await memberRepository.getOrganizationMembers(dbOrganization._id);

      expect(members.length).to.eq(1);
      expect(members[0]._userId).to.eq(session.user._id);
      expect(members[0].roles[0]).to.eq(MemberRoleEnum.ADMIN);
    });

    it('should create organization with correct name', async () => {
      const demoOrganization = {
        name: 'Hello Org',
      };
      const { body } = await session.testAgent.post('/v1/organizations').send(demoOrganization).expect(201);

      expect(body.data.name).to.eq(demoOrganization.name);
    });

    it('should not create organization with no name', async () => {
      await session.testAgent.post('/v1/organizations').send({}).expect(400);
    });
  });
});
