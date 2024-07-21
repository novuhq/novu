import jwt from 'jsonwebtoken';
import { expect } from 'chai';
import { EnvironmentEntity } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { UserSessionData } from '@novu/shared';

describe('Switch Environment - /auth/environments/:id/switch (POST) @skip-in-ee', async () => {
  let session: UserSession;

  describe('user has multiple environments', () => {
    let secondEnvironment: EnvironmentEntity;
    let firstEnvironment: EnvironmentEntity;

    before(async () => {
      session = new UserSession();
      await session.initialize();
      firstEnvironment = session.environment;
      secondEnvironment = await session.createEnvironment();
    });

    it('should switch to second environment', async () => {
      const { body } = await session.testAgent
        .post(`/v1/auth/environments/${secondEnvironment._id}/switch`)
        .expect(200);

      const newJwt = jwt.decode(body.data.token) as UserSessionData;

      expect(newJwt._id).to.equal(session.user._id);
      expect(newJwt.organizationId).to.equal(session.organization._id);
      expect(newJwt.environmentId).not.equal(firstEnvironment._id);
    });
  });
});
