import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { NOVU_ENCRYPTION_SUB_MASK } from '@novu/shared';

describe('Get My Environments - /environments (GET)', async () => {
  let session: UserSession;

  before(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should return all environments to user including API Keys when JWT auth is used', async () => {
    const { body } = await session.testAgent.get('/v1/environments');

    expect(body.data.length).to.be.greaterThanOrEqual(2);
    for (const elem of body.data) {
      expect(elem._organizationId).to.eq(session.organization._id);

      expect(elem.apiKeys.length).to.be.greaterThanOrEqual(1);
      expect(elem.apiKeys[0].key).to.not.contains(NOVU_ENCRYPTION_SUB_MASK);
      expect(elem.apiKeys[0]._userId).to.equal(session.user._id);
    }
  });
});
