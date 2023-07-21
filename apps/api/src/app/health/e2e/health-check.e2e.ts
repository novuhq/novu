import { UserSession } from '@novu/testing';
import {
  GetIsInMemoryClusterModeEnabled,
  InMemoryProviderEnum,
  InMemoryProviderService,
} from '@novu/application-generic';
import { expect } from 'chai';

describe('Health-check', () => {
  const session = new UserSession();

  before(async () => {
    const getIsInMemoryClusterModeEnabled = new GetIsInMemoryClusterModeEnabled();
    const inMemoryProviderService = new InMemoryProviderService(
      getIsInMemoryClusterModeEnabled,
      InMemoryProviderEnum.REDIS
    );

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
