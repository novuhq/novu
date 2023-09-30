import * as jwt from 'jsonwebtoken';
import { expect } from 'chai';
import { OrganizationEntity } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { IJwtPayload, MemberRoleEnum } from '@novu/shared';

describe('Switch Organization - /auth/organizations/:id/switch (POST)', async () => {
  let session: UserSession;

  describe('no organization for user', () => {
    before(async () => {
      session = new UserSession();
      await session.initialize({
        noOrganization: true,
      });
    });

    it('should fail for not authorized organization', async () => {
      const { body } = await session.testAgent
        .post('/v1/auth/organizations/5c573a9941a86c60689cf63a/switch')
        .expect(401);
    });
  });

  describe('user has single organizations', () => {
    before(async () => {
      session = new UserSession();
      await session.initialize({
        noOrganization: true,
      });
    });

    it('should switch the user current organization', async () => {
      const content = jwt.decode(session.token.split(' ')[1]) as IJwtPayload;

      expect(content._id).to.equal(session.user._id);
      const organization = await session.addOrganization();

      const { body } = await session.testAgent.post(`/v1/auth/organizations/${organization._id}/switch`).expect(200);

      const newJwt = jwt.decode(body.data) as IJwtPayload;

      expect(newJwt._id).to.equal(session.user._id);
      expect(newJwt.organizationId).to.equal(organization._id);
      expect(newJwt.roles.length).to.equal(1);
      expect(newJwt.roles[0]).to.equal(MemberRoleEnum.ADMIN);
    });
  });

  describe('user has multiple organizations', () => {
    let secondOrganization: OrganizationEntity;
    let firstOrganization: OrganizationEntity;

    before(async () => {
      session = new UserSession();
      await session.initialize();
      firstOrganization = session.organization;
      secondOrganization = await session.addOrganization();
    });

    it('should switch to second organization', async () => {
      const content = jwt.decode(session.token.split(' ')[1]) as IJwtPayload;

      expect(content.organizationId).to.equal(firstOrganization._id);

      const { body } = await session.testAgent
        .post(`/v1/auth/organizations/${secondOrganization._id}/switch`)
        .expect(200);

      const newJwt = jwt.decode(body.data) as IJwtPayload;

      expect(newJwt._id).to.equal(session.user._id);
      expect(newJwt.organizationId).to.equal(secondOrganization._id);
    });
  });
});
