import Redis from 'ioredis';
import {
  buildRedisClusterInstances,
  getRedisCluster,
  getRedisClusterProviderConfig,
  parseRedisClusterHosts,
  parseRedisClusterPorts,
  validateRedisClusterProviderConfig,
} from './redis-cluster-provider';

describe('Redis Cluster provider config', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('parseRedisClusterPorts', () => {
    it('parses a JSON array of ports', () => {
      expect(parseRedisClusterPorts('[7000,7001,7002]')).toEqual([7000, 7001, 7002]);
    });

    it('parses a JSON number', () => {
      expect(parseRedisClusterPorts('6379')).toEqual([6379]);
    });

    it('parses a comma-separated list', () => {
      expect(parseRedisClusterPorts('7000, 7001, 7002')).toEqual([7000, 7001, 7002]);
    });

    it('falls back to a singular port', () => {
      expect(parseRedisClusterPorts(undefined, '6379')).toEqual([6379]);
    });
  });

  describe('parseRedisClusterHosts', () => {
    it('splits comma-separated hosts', () => {
      expect(parseRedisClusterHosts('redis-0, redis-1,redis-2')).toEqual(['redis-0', 'redis-1', 'redis-2']);
    });
  });

  describe('buildRedisClusterInstances', () => {
    it('maps many ports onto a single host', () => {
      expect(buildRedisClusterInstances(['localhost'], [7000, 7001])).toEqual([
        { host: 'localhost', port: 7000 },
        { host: 'localhost', port: 7001 },
      ]);
    });

    it('maps many hosts onto a single port', () => {
      expect(buildRedisClusterInstances(['redis-0', 'redis-1'], [6379])).toEqual([
        { host: 'redis-0', port: 6379 },
        { host: 'redis-1', port: 6379 },
      ]);
    });
  });

  describe('getRedisClusterProviderConfig', () => {
    it('accepts REDIS_CLUSTER_SERVICE_PORT when PORTS is unset', () => {
      process.env.REDIS_CLUSTER_SERVICE_HOST = 'redis.internal';
      delete process.env.REDIS_CLUSTER_SERVICE_PORTS;
      process.env.REDIS_CLUSTER_SERVICE_PORT = '6379';

      const config = getRedisClusterProviderConfig();

      expect(config.ports).toEqual([6379]);
      expect(config.instances).toEqual([{ host: 'redis.internal', port: 6379 }]);
      expect(validateRedisClusterProviderConfig()).toEqual(true);
    });

    it('builds one seed node per host when a single port is set', () => {
      process.env.REDIS_CLUSTER_SERVICE_HOST = 'redis-0,redis-1,redis-2';
      process.env.REDIS_CLUSTER_SERVICE_PORT = '6379';
      delete process.env.REDIS_CLUSTER_SERVICE_PORTS;

      const config = getRedisClusterProviderConfig();

      expect(config.instances).toEqual([
        { host: 'redis-0', port: 6379 },
        { host: 'redis-1', port: 6379 },
        { host: 'redis-2', port: 6379 },
      ]);
    });

    it('is invalid without a host', () => {
      process.env.REDIS_CLUSTER_SERVICE_HOST = '';
      process.env.REDIS_CLUSTER_SERVICE_PORTS = '[6379]';

      expect(validateRedisClusterProviderConfig()).toEqual(false);
    });
  });

  describe('getRedisCluster', () => {
    it('uses master reads and disables request retries for BullMQ', () => {
      process.env.REDIS_CLUSTER_SERVICE_HOST = 'redis.internal';
      process.env.REDIS_CLUSTER_SERVICE_PORT = '6379';
      delete process.env.REDIS_CLUSTER_SERVICE_PORTS;

      const clusterSpy = jest.spyOn(Redis, 'Cluster').mockReturnValue({} as any);

      try {
        getRedisCluster();

        expect(clusterSpy).toHaveBeenCalledWith(
          [{ host: 'redis.internal', port: 6379 }],
          expect.objectContaining({
            scaleReads: 'master',
            redisOptions: expect.objectContaining({
              maxRetriesPerRequest: null,
            }),
          })
        );
      } finally {
        clusterSpy.mockRestore();
      }
    });
  });
});
