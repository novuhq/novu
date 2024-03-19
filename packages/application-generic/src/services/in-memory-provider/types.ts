import Redis, {
  ChainableCommander,
  Cluster,
  ClusterNode,
  ClusterOptions,
  RedisOptions,
  ScanStream,
} from 'ioredis';
import { ConnectionOptions } from 'tls';

export {
  Cluster,
  ClusterNode,
  ClusterOptions,
  ConnectionOptions,
  Redis,
  RedisOptions,
  ScanStream,
};

export type InMemoryProviderClient = Redis | Cluster | undefined;

export enum InMemoryProviderEnum {
  AZURE_CACHE_FOR_REDIS = 'AzureCacheForRedis',
  ELASTICACHE = 'Elasticache',
  MEMORY_DB = 'MemoryDB',
  REDIS = 'Redis',
  REDIS_CLUSTER = 'RedisCluster',
}

export type Pipeline = ChainableCommander;

export interface IProviderClusterConfigOptions {
  enableAutoPipelining?: boolean;
  showFriendlyErrorStack?: boolean;
}

export interface IRedisConfigOptions {
  showFriendlyErrorStack?: boolean;
}

export interface IEnvironmentConfigOptions {
  host: string;
  ports: string;
  providerId?: string;
  username?: string;
  password?: string;
}
