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

interface IMemoryDbClusterConfig {
  connectTimeout?: string;
  family?: string;
  host?: string;
  keepAlive?: string;
  keyPrefix?: string;
  username?: string;
  password?: string;
  port?: string;
  tls?: ConnectionOptions;
  ttl?: string;
}

export interface IMemoryDbClusterProviderConfig {
  connectTimeout: number;
  family: number;
  host?: string;
  instances?: ClusterNode[];
  keepAlive: number;
  keyPrefix: string;
  username?: string;
  password?: string;
  port?: number;
  tls?: ConnectionOptions;
  ttl: number;
}

export const getMemoryDbClusterProviderConfig = (): IMemoryDbClusterProviderConfig => {
  const redisClusterConfig: IMemoryDbClusterConfig = {
    host: convertStringValues(process.env.MEMORY_DB_CLUSTER_SERVICE_HOST),
    port: convertStringValues(process.env.MEMORY_DB_CLUSTER_SERVICE_PORT),
    ttl: convertStringValues(process.env.MEMORY_DB_CLUSTER_SERVICE_TTL),
    username: convertStringValues(process.env.MEMORY_DB_CLUSTER_SERVICE_USERNAME),
    password: convertStringValues(process.env.MEMORY_DB_CLUSTER_SERVICE_PASSWORD),
    connectTimeout: convertStringValues(process.env.MEMORY_DB_CLUSTER_SERVICE_CONNECTION_TIMEOUT),
    keepAlive: convertStringValues(process.env.MEMORY_DB_CLUSTER_SERVICE_KEEP_ALIVE),
    family: convertStringValues(process.env.MEMORY_DB_CLUSTER_SERVICE_FAMILY),
    keyPrefix: convertStringValues(process.env.MEMORY_DB_CLUSTER_SERVICE_KEY_PREFIX),
    tls: (process.env.MEMORY_DB_CLUSTER_SERVICE_TLS as ConnectionOptions)
      ? {
          servername: convertStringValues(process.env.MEMORY_DB_CLUSTER_SERVICE_HOST),
        }
      : {},
  };

  const { host } = redisClusterConfig;
  const port = redisClusterConfig.port ? Number(redisClusterConfig.port) : undefined;
  const { username } = redisClusterConfig;
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
    username,
    password,
    connectTimeout,
    family,
    keepAlive,
    keyPrefix,
    ttl,
    tls: redisClusterConfig.tls,
  };
};

export const getMemoryDbCluster = (enableAutoPipelining?: boolean): Cluster | undefined => {
  const { instances, password, username, tls } = getMemoryDbClusterProviderConfig();

  const options: ClusterOptions = {
    dnsLookup: (address, callback) => callback(null, address),
    enableAutoPipelining: enableAutoPipelining ?? false,
    enableOfflineQueue: false,
    redisOptions: {
      maxRetriesPerRequest: null,
      tls,
      connectTimeout: 10000,

      ...(password && { password }),
      ...(username && { username }),
    },
    clusterRetryStrategy: (times: number) => {
      return Math.max(Math.min(Math.exp(times), 20000), 1000);
    },
    scaleReads: 'master',
    /*
     *  Disabled in Prod as affects performance
     */
    showFriendlyErrorStack: process.env.NODE_ENV !== 'production',
    slotsRefreshTimeout: 10000,
  };

  Logger.log(
    `Initializing MemoryDb Cluster Provider with ${instances?.length} instances and auto-pipelining as ${options.enableAutoPipelining}`
  );

  if (instances && instances.length > 0) {
    return new Redis.Cluster(instances, options);
  }

  return undefined;
};

export const validateMemoryDbClusterProviderConfig = (): boolean => {
  const config = getMemoryDbClusterProviderConfig();

  return !!config.host && !!config.port;
};

export const isClientReady = (status: string): boolean => status === CLIENT_READY;
