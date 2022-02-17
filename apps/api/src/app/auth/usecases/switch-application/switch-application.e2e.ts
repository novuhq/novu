import * as jwt from 'jsonwebtoken';
import { expect } from 'chai';
import { ApplicationEntity } from '@notifire/dal';
import { UserSession } from '@notifire/testing';
import { IJwtPayload } from '@notifire/shared';

describe('Switch Application - /auth/applications/:id/switch (POST)', async () => {
  let session: UserSession;

  describe('user has multiple applications', () => {
    let secondApplication: ApplicationEntity;
    let firstApplication: ApplicationEntity;

    before(async () => {
      session = new UserSession();
      await session.initialize();
      firstApplication = session.application;
      secondApplication = await session.createApplication();
    });

    it('should switch to second application', async () => {
      const content = jwt.decode(session.token.split(' ')[1]) as IJwtPayload;

      expect(content.applicationId).to.equal(firstApplication._id);

      const { body } = await session.testAgent
        .post(`/v1/auth/applications/${secondApplication._id}/switch`)
        .expect(200);

      const newJwt = jwt.decode(body.data.token) as IJwtPayload;

      expect(newJwt._id).to.equal(session.user._id);
      expect(newJwt.organizationId).to.equal(session.organization._id);
      expect(newJwt.applicationId).to.equal(secondApplication._id);
    });
  });
});
