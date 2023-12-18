import Redis, {
  ChainableCommander,
  Cluster,
  ClusterNode,
  ClusterOptions,
  RedisOptions,
  ScanStream,
} from 'ioredis';
import { ConnectionOptions } from 'tls';
import { IAzureCacheForRedisClusterProviderConfig } from '../providers/azure-cache-for-redis-cluster-provider';
import { IElastiCacheClusterProviderConfig } from '../providers/elasticache-cluster-provider';
import { IRedisProviderConfig } from '../providers/redis-provider';
import { IRedisClusterProviderConfig } from '../providers/redis-cluster-provider';

export {
  Cluster,
  ClusterNode,
  ClusterOptions,
  ConnectionOptions,
  Redis,
  RedisOptions,
  ScanStream,
};

type IConfigOptions = IRedisConfigOptions | IProviderClusterConfigOptions;

export interface IProviderConfiguration {
  envOptions?: IEnvironmentConfigOptions;
  options?: IConfigOptions;
}

export type InMemoryProviderClient = Redis | Cluster | undefined;

export enum InMemoryProviderEnum {
  AZURE_CACHE_FOR_REDIS = 'AzureCacheForRedis',
  ELASTI_CACHE = 'Elasticache',
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

export interface IMemoryDbClusterProviderConfig {
  connectTimeout: number;
  family: number;
  host?: string;
  instances?: ClusterNode[];
  keepAlive: number;
  keyPrefix: string;
  username?: string;
  options?: IProviderClusterConfigOptions;
  password?: string;
  port?: number;
  tls?: ConnectionOptions;
  ttl: number;
}

export type InMemoryProviderConfig =
  | IAzureCacheForRedisClusterProviderConfig
  | IElastiCacheClusterProviderConfig
  | IMemoryDbClusterProviderConfig
  | IRedisProviderConfig
  | IRedisClusterProviderConfig;
