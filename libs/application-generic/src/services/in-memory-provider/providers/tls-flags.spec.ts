import { getAzureCacheForRedisClusterProviderConfig } from './azure-cache-for-redis-cluster-provider';
import { getElasticacheClusterProviderConfig } from './elasticache-cluster-provider';
import { getMemoryDbClusterProviderConfig } from './memory-db-cluster-provider';
import { getRedisProviderConfig } from './redis-provider';
import { getDefaultOnTlsOptions, isTlsFlagEnabled } from './variable-mappers';

const DISABLED_VALUES = ['false', 'FALSE', ' False ', '0', 'no', 'off'];
const ENABLED_VALUES = ['true', 'TRUE', '1', 'yes', 'on'];

describe('TLS flags', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('isTlsFlagEnabled', () => {
    it.each(ENABLED_VALUES)('is on for %s', (value) => {
      expect(isTlsFlagEnabled(value)).toBe(true);
    });

    it.each([...DISABLED_VALUES, undefined, '', '  ', 'undefined', 'null'])('is off for %s', (value) => {
      expect(isTlsFlagEnabled(value)).toBe(false);
    });
  });

  describe('getDefaultOnTlsOptions', () => {
    it.each([undefined, '', '  ', 'undefined', 'null'])('keeps TLS on without a servername for %s', (value) => {
      expect(getDefaultOnTlsOptions(value, 'cache.internal')).toEqual({});
    });

    it.each(ENABLED_VALUES)('adds the servername for %s', (value) => {
      expect(getDefaultOnTlsOptions(value, 'cache.internal')).toEqual({ servername: 'cache.internal' });
    });

    it.each(DISABLED_VALUES)('turns TLS off for %s', (value) => {
      expect(getDefaultOnTlsOptions(value, 'cache.internal')).toBeUndefined();
    });
  });

  describe('REDIS_TLS', () => {
    beforeEach(() => {
      process.env.REDIS_HOST = 'redis.internal';
    });

    it.each(DISABLED_VALUES)('leaves TLS off for %s', (value) => {
      process.env.REDIS_TLS = value;

      expect(getRedisProviderConfig().tls).toBeUndefined();
    });

    it('leaves TLS off when unset', () => {
      delete process.env.REDIS_TLS;

      expect(getRedisProviderConfig().tls).toBeUndefined();
    });

    it('enables TLS against REDIS_HOST for true', () => {
      process.env.REDIS_TLS = 'true';

      expect(getRedisProviderConfig().tls).toEqual({ servername: 'redis.internal' });
    });
  });

  describe.each([
    {
      name: 'ELASTICACHE_CLUSTER_SERVICE_TLS',
      hostVar: 'ELASTICACHE_CLUSTER_SERVICE_HOST',
      getConfig: getElasticacheClusterProviderConfig,
    },
    {
      name: 'MEMORY_DB_CLUSTER_SERVICE_TLS',
      hostVar: 'MEMORY_DB_CLUSTER_SERVICE_HOST',
      getConfig: getMemoryDbClusterProviderConfig,
    },
    {
      name: 'AZURE_CACHE_FOR_REDIS_CLUSTER_SERVICE_TLS',
      hostVar: 'AZURE_CACHE_FOR_REDIS_CLUSTER_SERVICE_HOST',
      getConfig: getAzureCacheForRedisClusterProviderConfig,
    },
  ])('$name', ({ name, hostVar, getConfig }) => {
    beforeEach(() => {
      process.env[hostVar] = 'cluster.internal';
    });

    it.each(DISABLED_VALUES)('turns TLS off for %s', (value) => {
      process.env[name] = value;

      expect(getConfig().tls).toBeUndefined();
    });

    it('keeps the existing TLS-on default when unset', () => {
      delete process.env[name];

      expect(getConfig().tls).toEqual({});
    });

    it('enables TLS against the host for true', () => {
      process.env[name] = 'true';

      expect(getConfig().tls).toEqual({ servername: 'cluster.internal' });
    });
  });
});
