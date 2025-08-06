import { Logger } from '@nestjs/common';
import Redis, { Cluster, ClusterNode, ClusterOptions, NodeRole } from 'ioredis';
import { ConnectionOptions } from 'tls';

import { convertStringValues } from './variable-mappers';

export { Cluster, ClusterOptions };

export const CLIENT_READY = 'ready';
const DEFAULT_TTL_SECONDS = 60 * 60 * 2;
const DEFAULT_CONNECT_TIMEOUT = 50000;
const DEFAULT_KEEP_ALIVE = 30000;
const DEFAULT_FAMILY = 4;
const DEFAULT_KEY_PREFIX = '';
const TTL_VARIANT_PERCENTAGE = 0.1;

interface IElasticacheClusterConfig {
  connectTimeout?: string;
  family?: string;
  host?: string;
  keepAlive?: string;
  keyPrefix?: string;
  password?: string;
  port?: string;
  tls?: ConnectionOptions;
  ttl?: string;
}

export interface IElasticacheClusterProviderConfig {
  connectTimeout: number;
  family: number;
  host?: string;
  instances?: ClusterNode[];
  keepAlive: number;
  keyPrefix: string;
  password?: string;
  port?: number;
  tls?: ConnectionOptions;
  ttl: number;
}

export const getElasticacheClusterProviderConfig = (): IElasticacheClusterProviderConfig => {
  const redisClusterConfig: IElasticacheClusterConfig = {
    host: convertStringValues(process.env.ELASTICACHE_CLUSTER_SERVICE_HOST),
    port: convertStringValues(process.env.ELASTICACHE_CLUSTER_SERVICE_PORT),
    ttl: convertStringValues(process.env.REDIS_CLUSTER_TTL),
    password: convertStringValues(process.env.REDIS_CLUSTER_PASSWORD),
    connectTimeout: convertStringValues(process.env.REDIS_CLUSTER_CONNECTION_TIMEOUT),
    keepAlive: convertStringValues(process.env.REDIS_CLUSTER_KEEP_ALIVE),
    family: convertStringValues(process.env.REDIS_CLUSTER_FAMILY),
    keyPrefix: convertStringValues(process.env.REDIS_CLUSTER_KEY_PREFIX),
    tls: (process.env.ELASTICACHE_CLUSTER_SERVICE_TLS as ConnectionOptions)
      ? {
          servername: convertStringValues(process.env.ELASTICACHE_CLUSTER_SERVICE_HOST),
        }
      : {},
  };

  const { host } = redisClusterConfig;
  const port = redisClusterConfig.port ? Number(redisClusterConfig.port) : undefined;
  const { password } = redisClusterConfig;
  const connectTimeout = redisClusterConfig.connectTimeout
    ? Number(redisClusterConfig.connectTimeout)
    : DEFAULT_CONNECT_TIMEOUT;
  const family = redisClusterConfig.family ? Number(redisClusterConfig.family) : DEFAULT_FAMILY;
  const keepAlive = redisClusterConfig.keepAlive ? Number(redisClusterConfig.keepAlive) : DEFAULT_KEEP_ALIVE;
  const keyPrefix = redisClusterConfig.keyPrefix ?? DEFAULT_KEY_PREFIX;
  const ttl = redisClusterConfig.ttl ? Number(redisClusterConfig.ttl) : DEFAULT_TTL_SECONDS;

  const instances: ClusterNode[] = [{ host, port }];

  return {
    host,
    port,
    instances,
    password,
    connectTimeout,
    family,
    keepAlive,
    keyPrefix,
    ttl,
    tls: redisClusterConfig.tls,
  };
};

export const getElasticacheCluster = (enableAutoPipelining?: boolean): Cluster | undefined => {
  const { instances, password, tls } = getElasticacheClusterProviderConfig();

  const options: ClusterOptions = {
    dnsLookup: (address, callback) => callback(null, address),
    enableAutoPipelining: enableAutoPipelining ?? false,
    enableOfflineQueue: false,
    enableReadyCheck: true,
    redisOptions: {
      tls,
      ...(password && { password }),
      connectTimeout: 10000,
    },
    scaleReads: 'slave',
    /*
     *  Disabled in Prod as affects performance
     */
    showFriendlyErrorStack: process.env.NODE_ENV !== 'production',
    slotsRefreshTimeout: 10000,
  };

  Logger.log(
    `Initializing Elasticache Cluster Provider with ${instances?.length} instances and auto-pipelining as ${options.enableAutoPipelining}`
  );

  if (instances && instances.length > 0) {
    return new Redis.Cluster(instances, options);
  }

  return undefined;
};

export const validateElasticacheClusterProviderConfig = (): boolean => {
  const config = getElasticacheClusterProviderConfig();

  return !!config.host && !!config.port;
};

export const isClientReady = (status: string): boolean => status === CLIENT_READY;
