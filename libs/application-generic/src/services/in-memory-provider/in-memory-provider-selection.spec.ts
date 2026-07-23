import { describe, expect, test } from 'vitest';

import {
  getCacheInMemoryProvider,
  getWebSocketsInMemoryProvider,
  getWorkflowInMemoryProvider,
  InMemoryProviderConsumer,
  isSingleNodeRedisHostPortRequired,
} from './in-memory-provider-selection';
import { InMemoryProviderEnum } from './types';

const clusterModeOn = { IS_IN_MEMORY_CLUSTER_MODE_ENABLED: 'true' };
const clusterModeOff = { IS_IN_MEMORY_CLUSTER_MODE_ENABLED: 'false' };

describe('getWorkflowInMemoryProvider', () => {
  test('returns MemoryDB on Novu Cloud', () => {
    expect(getWorkflowInMemoryProvider({ IS_SELF_HOSTED: 'false' })).toBe(InMemoryProviderEnum.MEMORY_DB);
  });

  test('returns REDIS for self-hosted community', () => {
    expect(getWorkflowInMemoryProvider({ IS_SELF_HOSTED: 'true', NOVU_ENTERPRISE: 'false' })).toBe(
      InMemoryProviderEnum.REDIS
    );
  });

  test('returns MemoryDB for self-hosted enterprise with MemoryDB configured', () => {
    expect(
      getWorkflowInMemoryProvider({
        IS_SELF_HOSTED: 'true',
        NOVU_ENTERPRISE: 'true',
        MEMORY_DB_CLUSTER_SERVICE_HOST: 'memorydb.example.com',
        MEMORY_DB_CLUSTER_SERVICE_PORT: '6379',
      })
    ).toBe(InMemoryProviderEnum.MEMORY_DB);
  });

  test('returns REDIS for self-hosted enterprise without MemoryDB', () => {
    expect(
      getWorkflowInMemoryProvider({
        IS_SELF_HOSTED: 'true',
        NOVU_ENTERPRISE: 'true',
        REDIS_MASTER_HOST: 'redis-master.example.com',
      })
    ).toBe(InMemoryProviderEnum.REDIS);
  });

  test('returns REDIS for self-hosted community even when MemoryDB env vars are set', () => {
    expect(
      getWorkflowInMemoryProvider({
        IS_SELF_HOSTED: 'true',
        NOVU_ENTERPRISE: 'false',
        MEMORY_DB_CLUSTER_SERVICE_HOST: 'memorydb.example.com',
        MEMORY_DB_CLUSTER_SERVICE_PORT: '6379',
      })
    ).toBe(InMemoryProviderEnum.REDIS);
  });

  test('returns REDIS for self-hosted without enterprise flag even when MemoryDB env vars are set', () => {
    expect(
      getWorkflowInMemoryProvider({
        IS_SELF_HOSTED: 'true',
        MEMORY_DB_CLUSTER_SERVICE_HOST: 'memorydb.example.com',
        MEMORY_DB_CLUSTER_SERVICE_PORT: '6379',
      })
    ).toBe(InMemoryProviderEnum.REDIS);
  });
});

describe('getCacheInMemoryProvider', () => {
  test('returns REDIS for self-hosted community', () => {
    expect(getCacheInMemoryProvider({ IS_SELF_HOSTED: 'true', NOVU_ENTERPRISE: 'false' })).toBe(
      InMemoryProviderEnum.REDIS
    );
  });

  test('returns master-slave for self-hosted enterprise without ElastiCache', () => {
    expect(
      getCacheInMemoryProvider({
        IS_SELF_HOSTED: 'true',
        NOVU_ENTERPRISE: 'true',
        REDIS_MASTER_HOST: 'redis-master.example.com',
      })
    ).toBe(InMemoryProviderEnum.REDIS_MASTER_SLAVE);
  });

  test('returns ElastiCache on Novu Cloud', () => {
    expect(getCacheInMemoryProvider({ IS_SELF_HOSTED: 'false' })).toBe(InMemoryProviderEnum.ELASTICACHE);
  });

  test('returns REDIS for self-hosted community even when ElastiCache env vars are set', () => {
    expect(
      getCacheInMemoryProvider({
        IS_SELF_HOSTED: 'true',
        NOVU_ENTERPRISE: 'false',
        ELASTICACHE_CLUSTER_SERVICE_HOST: 'cache.example.com',
        ELASTICACHE_CLUSTER_SERVICE_PORT: '6379',
      })
    ).toBe(InMemoryProviderEnum.REDIS);
  });

  test('returns REDIS for self-hosted without enterprise flag even when ElastiCache env vars are set', () => {
    expect(
      getCacheInMemoryProvider({
        IS_SELF_HOSTED: 'true',
        ELASTICACHE_CLUSTER_SERVICE_HOST: 'cache.example.com',
        ELASTICACHE_CLUSTER_SERVICE_PORT: '6379',
      })
    ).toBe(InMemoryProviderEnum.REDIS);
  });

  test('returns REDIS for community self-hosted when NOVU_ENTERPRISE is unset', () => {
    expect(getCacheInMemoryProvider({ IS_SELF_HOSTED: 'true' })).toBe(InMemoryProviderEnum.REDIS);
  });
});

describe('getWebSocketsInMemoryProvider', () => {
  test('returns REDIS for self-hosted community', () => {
    expect(getWebSocketsInMemoryProvider({ IS_SELF_HOSTED: 'true', NOVU_ENTERPRISE: 'false' })).toBe(
      InMemoryProviderEnum.REDIS
    );
  });

  test('returns ElastiCache for self-hosted enterprise', () => {
    expect(getWebSocketsInMemoryProvider({ IS_SELF_HOSTED: 'true', NOVU_ENTERPRISE: 'true' })).toBe(
      InMemoryProviderEnum.ELASTICACHE
    );
  });

  test('returns REDIS for self-hosted community even when ElastiCache env vars are set', () => {
    expect(
      getWebSocketsInMemoryProvider({
        IS_SELF_HOSTED: 'true',
        NOVU_ENTERPRISE: 'false',
        ELASTICACHE_CLUSTER_SERVICE_HOST: 'cache.example.com',
        ELASTICACHE_CLUSTER_SERVICE_PORT: '6379',
      })
    ).toBe(InMemoryProviderEnum.REDIS);
  });

  test('returns REDIS for self-hosted without enterprise flag', () => {
    expect(getWebSocketsInMemoryProvider({ IS_SELF_HOSTED: 'true' })).toBe(InMemoryProviderEnum.REDIS);
  });
});

describe('isSingleNodeRedisHostPortRequired', () => {
  test('requires REDIS_HOST when cluster mode is disabled even with cluster env vars', () => {
    expect(
      isSingleNodeRedisHostPortRequired(
        {
          ...clusterModeOff,
          REDIS_CLUSTER_SERVICE_HOST: 'cluster.example.com',
          REDIS_CLUSTER_SERVICE_PORTS: '[6379,6380]',
        },
        InMemoryProviderConsumer.WORKFLOW
      )
    ).toBe(true);
  });

  test('allows optional REDIS_HOST on Novu Cloud for workflow', () => {
    expect(
      isSingleNodeRedisHostPortRequired(
        { ...clusterModeOn, IS_SELF_HOSTED: 'false' },
        InMemoryProviderConsumer.WORKFLOW
      )
    ).toBe(false);
  });

  test('requires REDIS_HOST for self-hosted EE with only REDIS_MASTER_HOST on api', () => {
    expect(
      isSingleNodeRedisHostPortRequired(
        {
          ...clusterModeOn,
          IS_SELF_HOSTED: 'true',
          NOVU_ENTERPRISE: 'true',
          REDIS_MASTER_HOST: 'redis-master.example.com',
        },
        [InMemoryProviderConsumer.WORKFLOW, InMemoryProviderConsumer.CACHE]
      )
    ).toBe(true);
  });

  test('allows optional REDIS_HOST for self-hosted EE with MemoryDB on worker', () => {
    expect(
      isSingleNodeRedisHostPortRequired(
        {
          ...clusterModeOn,
          IS_SELF_HOSTED: 'true',
          NOVU_ENTERPRISE: 'true',
          MEMORY_DB_CLUSTER_SERVICE_HOST: 'memorydb.example.com',
          MEMORY_DB_CLUSTER_SERVICE_PORT: '6379',
        },
        InMemoryProviderConsumer.WORKFLOW
      )
    ).toBe(false);
  });

  test('allows optional REDIS_HOST for ws on self-hosted enterprise with cluster mode', () => {
    expect(
      isSingleNodeRedisHostPortRequired(
        {
          ...clusterModeOn,
          IS_SELF_HOSTED: 'true',
          NOVU_ENTERPRISE: 'true',
        },
        InMemoryProviderConsumer.WEB_SOCKETS
      )
    ).toBe(false);
  });

  test('requires REDIS_HOST for self-hosted community workflow', () => {
    expect(
      isSingleNodeRedisHostPortRequired(
        {
          ...clusterModeOn,
          IS_SELF_HOSTED: 'true',
          NOVU_ENTERPRISE: 'false',
        },
        InMemoryProviderConsumer.WORKFLOW
      )
    ).toBe(true);
  });

  test('allows optional REDIS_HOST for self-hosted EE api when MemoryDB is configured and cache is not', () => {
    expect(
      isSingleNodeRedisHostPortRequired(
        {
          ...clusterModeOn,
          IS_SELF_HOSTED: 'true',
          NOVU_ENTERPRISE: 'true',
          MEMORY_DB_CLUSTER_SERVICE_HOST: 'memorydb.example.com',
          MEMORY_DB_CLUSTER_SERVICE_PORT: '6379',
        },
        [InMemoryProviderConsumer.WORKFLOW, InMemoryProviderConsumer.CACHE]
      )
    ).toBe(false);
  });

  test('allows optional REDIS_HOST for self-hosted EE api when MemoryDB and ElastiCache are configured', () => {
    expect(
      isSingleNodeRedisHostPortRequired(
        {
          ...clusterModeOn,
          IS_SELF_HOSTED: 'true',
          NOVU_ENTERPRISE: 'true',
          MEMORY_DB_CLUSTER_SERVICE_HOST: 'memorydb.example.com',
          MEMORY_DB_CLUSTER_SERVICE_PORT: '6379',
          ELASTICACHE_CLUSTER_SERVICE_HOST: 'cache.example.com',
          ELASTICACHE_CLUSTER_SERVICE_PORT: '6379',
        },
        [InMemoryProviderConsumer.WORKFLOW, InMemoryProviderConsumer.CACHE]
      )
    ).toBe(false);
  });

  test('requires REDIS_HOST for self-hosted EE api when cache is optional but workflow still uses single-node Redis', () => {
    expect(
      isSingleNodeRedisHostPortRequired(
        {
          ...clusterModeOn,
          IS_SELF_HOSTED: 'true',
          NOVU_ENTERPRISE: 'true',
        },
        [InMemoryProviderConsumer.WORKFLOW, InMemoryProviderConsumer.CACHE]
      )
    ).toBe(true);
  });
});
