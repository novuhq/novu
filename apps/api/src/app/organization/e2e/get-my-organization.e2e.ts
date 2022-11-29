import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('Get my organization - /organizations/me (GET)', async () => {
  let session: UserSession;

  before(async () => {
    session = new UserSession();
    await session.initialize();
  });

  describe('Get organization profile', () => {
    it('should return the correct organization', async () => {
      const { body } = await session.testAgent.get('/v1/organizations/me').expect(200);

      expect(body.data._id).to.eq(session.organization._id);
    });
  });
});
