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
  ELASTICACHE = 'Elasticache',
  MEMORY_DB = 'MemoryDB',
  REDIS = 'Redis',
  REDIS_CLUSTER = 'RedisCluster',
  OLD_INSTANCE_REDIS = 'OldInstanceRedis',
}

export type Pipeline = ChainableCommander;
