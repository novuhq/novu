import {
  ChainableCommander,
  Cluster,
  ClusterOptions,
  Redis,
  RedisOptions,
  ScanStream,
} from 'ioredis';

export { Cluster, ClusterOptions, Redis, RedisOptions, ScanStream };

export type InMemoryProviderClient = Redis | Cluster | undefined;

export enum InMemoryProviderEnum {
  AZURE_CACHE_FOR_REDIS = 'AzureCacheForRedis',
  ELASTICACHE = 'Elasticache',
  MEMORY_DB = 'MemoryDB',
  REDIS = 'Redis',
  REDIS_CLUSTER = 'RedisCluster',
}

export type Pipeline = ChainableCommander;
