import { IElasticacheClusterProviderConfig } from './elasticache-cluster-provider';
import { IMemoryDbClusterProviderConfig } from './memory-db-cluster-provider';
import { getClusterProvider } from './providers';

import { InMemoryProviderEnum } from '../types';

describe('Client and config for cluster', () => {
  const elasticacheUrl = 'http://elasticache.com';
  const elasticachePort = '10000';
  const memoryDbUrl = 'http://memory-db.com';
  const memoryDbPort = '10001';
  const redisClusterUrl = 'http://redis.com';
  const redisClusterPorts = JSON.stringify([
    9991, 9992, 9993, 9994, 9995, 9996,
  ]);

  it('should return Elasticache config after validating it', () => {
    process.env.ELASTICACHE_CLUSTER_SERVICE_HOST = elasticacheUrl;
    process.env.ELASTICACHE_CLUSTER_SERVICE_PORT = elasticachePort;
    process.env.REDIS_CLUSTER_SERVICE_HOST = redisClusterUrl;
    process.env.REDIS_CLUSTER_SERVICE_PORTS = redisClusterPorts;

    const { getConfig } = getClusterProvider(InMemoryProviderEnum.ELASTICACHE);
    const config: IElasticacheClusterProviderConfig = getConfig();
    expect(config.host).toEqual(elasticacheUrl);
    expect(config.port).toEqual(Number(elasticachePort));
    expect(config.ttl).toEqual(7200);
  });

  it('should return MemoryDB config after validating it', () => {
    process.env.MEMORY_DB_CLUSTER_SERVICE_HOST = memoryDbUrl;
    process.env.MEMORY_DB_CLUSTER_SERVICE_PORT = memoryDbPort;
    process.env.REDIS_CLUSTER_SERVICE_HOST = redisClusterUrl;
    process.env.REDIS_CLUSTER_SERVICE_PORTS = redisClusterPorts;

    const { getConfig } = getClusterProvider(InMemoryProviderEnum.MEMORY_DB);
    const config: IMemoryDbClusterProviderConfig = getConfig();
    expect(config.host).toEqual(memoryDbUrl);
    expect(config.port).toEqual(Number(memoryDbPort));
    expect(config.ttl).toEqual(7200);
  });

  it('should throw an error if Redis is passed as provider', () => {
    process.env.ELASTICACHE_CLUSTER_SERVICE_HOST = '';
    process.env.ELASTICACHE_CLUSTER_SERVICE_PORT = '';
    process.env.REDIS_CLUSTER_SERVICE_HOST = '';
    process.env.REDIS_CLUSTER_SERVICE_PORTS = redisClusterPorts;

    try {
      const { getConfig } = getClusterProvider(InMemoryProviderEnum.REDIS);

      fail('should not reach here');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      const { message } = error as Error;
      expect(message).toEqual(
        'Provider Redis is not available in Cluster Mode'
      );
    }
  });
});
