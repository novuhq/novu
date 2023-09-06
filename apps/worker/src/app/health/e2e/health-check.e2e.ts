import { InMemoryProviderEnum, InMemoryProviderService } from '@novu/application-generic';
import { expect } from 'chai';
import * as request from 'supertest';
import * as defaults from 'superagent-defaults';

describe('Health-check', () => {
  let testAgent;

  before(async () => {
    const inMemoryProviderService = new InMemoryProviderService(InMemoryProviderEnum.REDIS);
    await inMemoryProviderService.delayUntilReadiness();

    testAgent = defaults(request(`http://localhost:${process.env.PORT}`));
  });

  describe('/health-check (GET)', () => {
    it('should correctly return a health check', async () => {
      const {
        body: { data },
      } = await testAgent.get('/v1/health-check');

      expect(data?.status).to.equal('ok');
    });
  });
});
