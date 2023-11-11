import { InMemoryProviderService } from './in-memory-provider.service';
import { InMemoryProviderEnum } from './types';

let inMemoryProviderService: InMemoryProviderService;

describe('In-memory Provider Service', () => {
  describe('Non cluster mode', () => {
    beforeEach(async () => {
      inMemoryProviderService = new InMemoryProviderService(
        InMemoryProviderEnum.REDIS,
        false
      );

      await inMemoryProviderService.delayUntilReadiness();

      expect(inMemoryProviderService.getStatus()).toEqual('ready');
    });

    afterEach(async () => {
      await inMemoryProviderService.shutdown();
    });

    describe('Set up', () => {
      it('should have the right config', () => {
        const { inMemoryProviderConfig } = inMemoryProviderService;

        expect(inMemoryProviderConfig.host).toEqual(
          process.env.REDIS_CACHE_SERVICE_HOST
        );

        if ('port' in inMemoryProviderConfig) {
          expect(inMemoryProviderConfig.port).toEqual(
            Number(process.env.REDIS_CACHE_SERVICE_PORT)
          );
        }

        expect(inMemoryProviderConfig.connectTimeout).toEqual(50_000);
        expect(inMemoryProviderConfig.family).toEqual(4);
        expect(inMemoryProviderConfig.keepAlive).toEqual(30_000);
        expect(inMemoryProviderConfig.keyPrefix).toEqual('');
        expect(inMemoryProviderConfig.password).toEqual(undefined);
        expect(inMemoryProviderConfig.ttl).toEqual(7_200);
        expect(inMemoryProviderConfig.tls).toEqual(undefined);
      });

      it('should instantiate the provider properly', async () => {
        const { inMemoryProviderClient } = inMemoryProviderService;

        expect(inMemoryProviderClient.status).toEqual('ready');
        expect(inMemoryProviderClient.isCluster).toEqual(false);

        const options = inMemoryProviderService.getOptions();

        expect(options?.host).toEqual(process.env.REDIS_CACHE_SERVICE_HOST);
        expect(options?.port).toEqual(
          Number(process.env.REDIS_CACHE_SERVICE_PORT)
        );
        expect(options?.role).toEqual('master');
        expect(options?.username).toEqual(null);
        expect(options?.password).toEqual(null);
        expect(options?.db).toEqual(1);
      });

      it('should we able to operate in the in-memory database', async () => {
        const pingCommandResult =
          await inMemoryProviderService.inMemoryProviderClient.ping();
        expect(pingCommandResult).toEqual('PONG');

        const valueToStore = 'non cluster mode';
        await inMemoryProviderService.inMemoryProviderClient.set(
          'novu',
          valueToStore
        );
        const value = await inMemoryProviderService.inMemoryProviderClient.get(
          'novu'
        );
        expect(value).toEqual('non cluster mode');
      });
    });
  });

  describe('Cluster mode', () => {
    beforeEach(async () => {
      inMemoryProviderService = new InMemoryProviderService(
        InMemoryProviderEnum.REDIS,
        true
      );
      await inMemoryProviderService.delayUntilReadiness();

      expect(inMemoryProviderService.getStatus()).toEqual('ready');
    });

    afterEach(async () => {
      await inMemoryProviderService.shutdown();
    });

    describe('TEMP: Check if enableAutoPipelining true is set properly in Cluster', () => {
      it('enableAutoPipelining is enabled', async () => {
        const clusterWithPipelining = new InMemoryProviderService(
          InMemoryProviderEnum.REDIS,
          true,
          true
        );
        await clusterWithPipelining.delayUntilReadiness();

        expect(clusterWithPipelining.getStatus()).toEqual('ready');
        expect(
          clusterWithPipelining.inMemoryProviderClient.options
            .enableAutoPipelining
        ).toEqual(true);
      });
    });

    describe('Set up', () => {
      it('should have the right config', () => {
        const { inMemoryProviderConfig } = inMemoryProviderService;

        expect(inMemoryProviderConfig.host).toEqual(
          process.env.REDIS_CLUSTER_SERVICE_HOST
        );
        if ('ports' in inMemoryProviderConfig) {
          const ports =
            process.env.REDIS_CLUSTER_SERVICE_PORTS &&
            JSON.parse(process.env.REDIS_CLUSTER_SERVICE_PORTS);
          expect(inMemoryProviderConfig.ports).toEqual(ports);
        }

        const instances =
          process.env.REDIS_CLUSTER_SERVICE_PORTS &&
          JSON.parse(process.env.REDIS_CLUSTER_SERVICE_PORTS).map((port) => ({
            host: process.env.REDIS_CLUSTER_SERVICE_HOST,
            port,
          }));
        if ('instances' in inMemoryProviderConfig) {
          expect(inMemoryProviderConfig.instances).toEqual(instances);
        }

        expect(inMemoryProviderConfig.connectTimeout).toEqual(50_000);
        expect(inMemoryProviderConfig.family).toEqual(4);
        expect(inMemoryProviderConfig.keepAlive).toEqual(30_000);
        expect(inMemoryProviderConfig.keyPrefix).toEqual('');
        expect(inMemoryProviderConfig.password).toEqual('');
        expect(inMemoryProviderConfig.ttl).toEqual(7_200);
      });

      it('should instantiate the provider properly', async () => {
        const { inMemoryProviderClient } = inMemoryProviderService;

        expect(inMemoryProviderClient.status).toEqual('ready');
        expect(inMemoryProviderClient.isCluster).toEqual(true);
        expect(inMemoryProviderClient.options.enableAutoPipelining).toEqual(
          false
        );

        const options = inMemoryProviderService.getOptions();
        expect(options).toEqual(undefined);

        const clusterOptions =
          await inMemoryProviderService.getClusterOptions();
        expect(clusterOptions.enableOfflineQueue).toEqual(false);
        expect(clusterOptions.enableReadyCheck).toEqual(true);
        expect(clusterOptions.maxRedirections).toEqual(16);
        expect(clusterOptions.retryDelayOnClusterDown).toEqual(100);
        expect(clusterOptions.retryDelayOnFailover).toEqual(100);
        expect(clusterOptions.retryDelayOnTryAgain).toEqual(100);
      });

      it('should we able to operate in the in-memory database', async () => {
        const pingCommandResult =
          await inMemoryProviderService.inMemoryProviderClient.ping();
        expect(pingCommandResult).toEqual('PONG');

        const valueToStore = 'cluster mode';
        await inMemoryProviderService.inMemoryProviderClient.set(
          'novu',
          valueToStore
        );
        const value = await inMemoryProviderService.inMemoryProviderClient.get(
          'novu'
        );
        expect(value).toEqual('cluster mode');
      });
    });
  });
});
