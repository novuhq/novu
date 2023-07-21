import {
  InMemoryProviderEnum,
  InMemoryProviderService,
} from './in-memory-provider.service';

import { GetIsInMemoryClusterModeEnabled } from '../../usecases';
import { IElasticacheClusterProviderConfig } from './elasticache-cluster-provider';
import { IRedisClusterProviderConfig } from './redis-cluster-provider';

const getIsInMemoryClusterModeEnabled = new GetIsInMemoryClusterModeEnabled();

let inMemoryProviderService: InMemoryProviderService;

describe('In-memory Provider Service', () => {
  describe('Non cluster mode', () => {
    beforeEach(async () => {
      process.env.IS_IN_MEMORY_CLUSTER_MODE_ENABLED = 'false';

      inMemoryProviderService = new InMemoryProviderService(
        getIsInMemoryClusterModeEnabled,
        InMemoryProviderEnum.REDIS
      );

      await inMemoryProviderService.delayUntilReadiness();

      expect(inMemoryProviderService.getStatus()).toEqual('ready');
    });

    afterAll(async () => {
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
        expect(inMemoryProviderConfig.password).toEqual('');
        expect(inMemoryProviderConfig.ttl).toEqual(7_200);
        expect(inMemoryProviderConfig.tls).toEqual(undefined);
      });

      it('should instantiate the provider properly', async () => {
        expect(await inMemoryProviderService.isClusterMode()).toEqual(false);

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
        expect(options?.password).toEqual('');
        expect(options?.db).toEqual(0);
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
      process.env.IS_IN_MEMORY_CLUSTER_MODE_ENABLED = 'true';

      inMemoryProviderService = new InMemoryProviderService(
        getIsInMemoryClusterModeEnabled,
        InMemoryProviderEnum.REDIS
      );
      await inMemoryProviderService.delayUntilReadiness();

      expect(inMemoryProviderService.getStatus()).toEqual('ready');
    });

    afterAll(async () => {
      await inMemoryProviderService.shutdown();
    });

    describe('TEMP: Check if enableAutoPipelining true is set properly in Cluster', () => {
      it('enableAutoPipelining is enabled', async () => {
        const clusterWithPipelining = new InMemoryProviderService(
          getIsInMemoryClusterModeEnabled,
          InMemoryProviderEnum.REDIS,
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
        expect(await inMemoryProviderService.isClusterMode()).toEqual(true);

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

  describe('Client and config for cluster', () => {
    const elasticacheUrl = 'http://elasticache.com';
    const elasticachePort = '9999';
    const redisClusterUrl = 'http://redis.com';
    const redisClusterPorts = JSON.stringify([
      9991, 9992, 9993, 9994, 9995, 9996,
    ]);

    it('should return Elasticache config after validating it', () => {
      process.env.ELASTICACHE_CLUSTER_SERVICE_HOST = elasticacheUrl;
      process.env.ELASTICACHE_CLUSTER_SERVICE_PORT = elasticachePort;
      process.env.REDIS_CLUSTER_SERVICE_HOST = redisClusterUrl;
      process.env.REDIS_CLUSTER_SERVICE_PORTS = redisClusterPorts;

      const { getConfig } =
        inMemoryProviderService.getClientAndConfigForCluster(
          InMemoryProviderEnum.ELASTICACHE
        );
      const config: IElasticacheClusterProviderConfig = getConfig();
      expect(config.host).toEqual(elasticacheUrl);
      expect(config.port).toEqual(Number(elasticachePort));
      expect(config.ttl).toEqual(7200);
    });

    it('should return Redis Cluster config after validating Elasticache faulty URL config', () => {
      process.env.ELASTICACHE_CLUSTER_SERVICE_HOST = '';
      process.env.ELASTICACHE_CLUSTER_SERVICE_PORT = elasticachePort;
      process.env.REDIS_CLUSTER_SERVICE_HOST = redisClusterUrl;
      process.env.REDIS_CLUSTER_SERVICE_PORTS = redisClusterPorts;

      const { getConfig } =
        inMemoryProviderService.getClientAndConfigForCluster(
          InMemoryProviderEnum.ELASTICACHE
        );
      const config: IRedisClusterProviderConfig = getConfig();
      expect(config.host).toEqual(redisClusterUrl);
      expect(config.ports).toEqual(JSON.parse(redisClusterPorts));
      expect(config.ttl).toEqual(7200);
    });

    it('should return Redis Cluster config after validating Elasticache faulty port config', () => {
      process.env.ELASTICACHE_CLUSTER_SERVICE_HOST = elasticacheUrl;
      process.env.ELASTICACHE_CLUSTER_SERVICE_PORT = '';
      process.env.REDIS_CLUSTER_SERVICE_HOST = redisClusterUrl;
      process.env.REDIS_CLUSTER_SERVICE_PORTS = redisClusterPorts;

      const { getConfig } =
        inMemoryProviderService.getClientAndConfigForCluster(
          InMemoryProviderEnum.ELASTICACHE
        );

      const config: IRedisClusterProviderConfig = getConfig();
      expect(config.host).toEqual(redisClusterUrl);
      expect(config.ports).toEqual(JSON.parse(redisClusterPorts));
      expect(config.ttl).toEqual(7200);
    });

    it('should throw an error if Redis Cluster config has faulty URL config', () => {
      process.env.ELASTICACHE_CLUSTER_SERVICE_HOST = '';
      process.env.ELASTICACHE_CLUSTER_SERVICE_PORT = '';
      process.env.REDIS_CLUSTER_SERVICE_HOST = '';
      process.env.REDIS_CLUSTER_SERVICE_PORTS = redisClusterPorts;

      try {
        const { getConfig } =
          inMemoryProviderService.getClientAndConfigForCluster(
            InMemoryProviderEnum.ELASTICACHE
          );

        fail('should not reach here');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        const { message } = error as Error;
        expect(message).toEqual(
          'Provider Elasticache is not properly configured in the environment variables'
        );
      }
    });

    it('should throw an error if Redis Cluster config has faulty port config', () => {
      process.env.ELASTICACHE_CLUSTER_SERVICE_HOST = '';
      process.env.ELASTICACHE_CLUSTER_SERVICE_PORT = '';
      process.env.REDIS_CLUSTER_SERVICE_HOST = redisClusterUrl;
      process.env.REDIS_CLUSTER_SERVICE_PORTS = '';

      try {
        const { getConfig } =
          inMemoryProviderService.getClientAndConfigForCluster(
            InMemoryProviderEnum.ELASTICACHE
          );

        fail('should not reach here');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        const { message } = error as Error;
        expect(message).toEqual(
          'Provider Elasticache is not properly configured in the environment variables'
        );
      }
    });
  });
});
