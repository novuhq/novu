import { expect } from 'chai';

import { InMemoryProviderService } from './in-memory-provider.service';

let inMemoryProviderService: InMemoryProviderService;

describe.only('In-memory Provider Service', () => {
  describe('Non cluster mode', () => {
    beforeEach(() => {
      process.env.IN_MEMORY_CLUSTER_MODE_ENABLED = 'false';

      inMemoryProviderService = new InMemoryProviderService();
    });

    describe('Set up', () => {
      it('should have the right config', () => {
        const { inMemoryProviderConfig } = inMemoryProviderService;

        expect(inMemoryProviderConfig.host).to.eql(process.env.REDIS_CACHE_SERVICE_HOST);

        if ('port' in inMemoryProviderConfig) {
          expect(inMemoryProviderConfig.port).to.eql(Number(process.env.REDIS_CACHE_SERVICE_PORT));
        }

        expect(inMemoryProviderConfig.connectTimeout).to.eql(50_000);
        expect(inMemoryProviderConfig.family).to.eql(4);
        expect(inMemoryProviderConfig.keepAlive).to.eql(30_000);
        expect(inMemoryProviderConfig.keyPrefix).to.eql('');
        expect(inMemoryProviderConfig.password).to.eql('');
        expect(inMemoryProviderConfig.ttl).to.eql(7_200);
      });

      it('should instantiate the provider properly', async () => {
        expect(inMemoryProviderService.isClusterMode()).to.eql(false);

        const { inMemoryProviderClient } = inMemoryProviderService;

        expect(inMemoryProviderClient!.status).to.eql('connecting');
        expect(inMemoryProviderClient!.isCluster).to.eql(false);

        const options = inMemoryProviderService.getOptions();

        expect(options?.host).to.eql(process.env.REDIS_CACHE_SERVICE_HOST);
        expect(options?.port).to.eql(Number(process.env.REDIS_CACHE_SERVICE_PORT));
        expect(options?.role).to.eql('master');
        expect(options?.username).to.eql(null);
        expect(options?.password).to.eql('');
        expect(options?.db).to.eql(0);
      });

      it('should we able to operate in the in-memory database', async () => {
        const pingCommandResult = await inMemoryProviderService.inMemoryProviderClient!.ping();
        expect(pingCommandResult).to.eql('PONG');

        const valueToStore = 'non cluster mode';
        await inMemoryProviderService.inMemoryProviderClient!.set('novu', valueToStore);
        const value = await inMemoryProviderService.inMemoryProviderClient!.get('novu');
        expect(value).to.eql('non cluster mode');
      });
    });
  });

  describe('Cluster mode', () => {
    beforeEach(() => {
      process.env.IN_MEMORY_CLUSTER_MODE_ENABLED = 'true';

      inMemoryProviderService = new InMemoryProviderService();
    });

    describe('Set up', () => {
      it('should have the right config', () => {
        const { inMemoryProviderConfig } = inMemoryProviderService;

        expect(inMemoryProviderConfig.host).to.eql(process.env.REDIS_CLUSTER_SERVICE_HOST);
        if ('ports' in inMemoryProviderConfig) {
          const ports = process.env.REDIS_CLUSTER_SERVICE_PORTS && JSON.parse(process.env.REDIS_CLUSTER_SERVICE_PORTS);
          expect(inMemoryProviderConfig.ports).to.eql(ports);
        }

        const instances =
          process.env.REDIS_CLUSTER_SERVICE_PORTS &&
          JSON.parse(process.env.REDIS_CLUSTER_SERVICE_PORTS).map((port) => ({
            host: process.env.REDIS_CLUSTER_SERVICE_HOST,
            port,
          }));
        if ('instances' in inMemoryProviderConfig) {
          expect(inMemoryProviderConfig.instances).to.eql(instances);
        }

        expect(inMemoryProviderConfig.connectTimeout).to.eql(50_000);
        expect(inMemoryProviderConfig.family).to.eql(4);
        expect(inMemoryProviderConfig.keepAlive).to.eql(30_000);
        expect(inMemoryProviderConfig.keyPrefix).to.eql('');
        expect(inMemoryProviderConfig.password).to.eql('');
        expect(inMemoryProviderConfig.ttl).to.eql(7_200);
      });

      it('should instantiate the provider properly', async () => {
        expect(inMemoryProviderService.isClusterMode()).to.eql(true);

        const { inMemoryProviderClient } = inMemoryProviderService;

        expect(inMemoryProviderClient!.status).to.eql('connecting');
        expect(inMemoryProviderClient!.isCluster).to.eql(true);

        const options = inMemoryProviderService.getOptions();
        expect(options).to.eql({ tls: {} });

        const clusterOptions = inMemoryProviderService.getClusterOptions();
        expect(clusterOptions!.enableOfflineQueue).to.eql(true);
        expect(clusterOptions!.enableReadyCheck).to.eql(true);
        expect(clusterOptions!.maxRedirections).to.eql(16);
        expect(clusterOptions!.retryDelayOnClusterDown).to.eql(100);
        expect(clusterOptions!.retryDelayOnFailover).to.eql(100);
        expect(clusterOptions!.retryDelayOnTryAgain).to.eql(100);
      });

      it.only('should we able to operate in the in-memory database', async () => {
        console.log(inMemoryProviderService.inMemoryProviderClient);
        const pingCommandResult = await inMemoryProviderService.inMemoryProviderClient!.ping();
        expect(pingCommandResult).to.eql('PONG');

        const valueToStore = 'cluster mode';
        await inMemoryProviderService.inMemoryProviderClient!.set('novu', valueToStore);
        const value = await inMemoryProviderService.inMemoryProviderClient!.get('novu');
        expect(value).to.eql('cluster mode');
      });
    });
  });
});
