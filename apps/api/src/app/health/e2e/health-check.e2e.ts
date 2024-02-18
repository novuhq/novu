import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('Health-check', () => {
  const session = new UserSession();

  before(async () => {
    await session.initialize();
  });

  describe('/health-check (GET)', () => {
    it('should correctly return a health check', async () => {
      const result = await session.testAgent.get('/v1/health-check');
      const { data } = result.body || {};

      expect(data?.status).to.equal('ok');
    });
  });
});
