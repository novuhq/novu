import { ConnectionOptions } from 'tls';
import { Logger } from '@nestjs/common';

import { convertStringValues } from './variable-mappers';

import {
  Cluster,
  ClusterNode,
  ClusterOptions,
  IEnvironmentConfigOptions,
  IProviderClusterConfigOptions,
  Redis,
} from '../types';

export const CLIENT_READY = 'ready';
const DEFAULT_TTL_SECONDS = 60 * 60 * 2;
const DEFAULT_CONNECT_TIMEOUT = 50000;
const DEFAULT_KEEP_ALIVE = 30000;
const DEFAULT_FAMILY = 4;
const DEFAULT_KEY_PREFIX = '';
const TTL_VARIANT_PERCENTAGE = 0.1;

interface IRedisClusterConfig {
  connectTimeout?: string;
  family?: string;
  host?: string;
  keepAlive?: string;
  keyPrefix?: string;
  password?: string;
  ports?: string;
  tls?: ConnectionOptions;
  ttl?: string;
  username?: string;
}

export interface IRedisClusterProviderConfig {
  connectTimeout: number;
  family: number;
  host?: string;
  instances?: ClusterNode[];
  keepAlive: number;
  keyPrefix: string;
  options?: IProviderClusterConfigOptions;
  password?: string;
  ports?: number[];
  tls?: ConnectionOptions;
  ttl: number;
  username?: string;
}

export const getRedisClusterProviderConfig = (
  envOptions?: IEnvironmentConfigOptions,
  options?: IProviderClusterConfigOptions
): IRedisClusterProviderConfig => {
  let redisClusterConfig: Partial<IRedisClusterConfig>;

  if (envOptions) {
    redisClusterConfig = {
      host: convertStringValues(envOptions.host),
      password: convertStringValues(envOptions.password),
      ports: convertStringValues(envOptions.ports),
      username: convertStringValues(envOptions.username),
    };
  } else {
    redisClusterConfig = {
      host: convertStringValues(process.env.REDIS_CLUSTER_SERVICE_HOST),
      password: convertStringValues(process.env.REDIS_CLUSTER_PASSWORD),
      ports: convertStringValues(process.env.REDIS_CLUSTER_SERVICE_PORTS),
      username: convertStringValues(process.env.REDIS_CLUSTER_USERNAME),
    };
  }

  redisClusterConfig = {
    ...redisClusterConfig,
    ttl: convertStringValues(process.env.REDIS_CLUSTER_TTL),
    connectTimeout: convertStringValues(
      process.env.REDIS_CLUSTER_CONNECTION_TIMEOUT
    ),
    keepAlive: convertStringValues(process.env.REDIS_CLUSTER_KEEP_ALIVE),
    family: convertStringValues(process.env.REDIS_CLUSTER_FAMILY),
    keyPrefix: convertStringValues(process.env.REDIS_CLUSTER_KEY_PREFIX),
    tls: process.env.REDIS_CLUSTER_TLS as ConnectionOptions,
  };

  const host = redisClusterConfig.host;
  const ports = redisClusterConfig.ports
    ? JSON.parse(redisClusterConfig.ports)
    : [];
  const password = redisClusterConfig.password;
  const username = redisClusterConfig.username;
  const connectTimeout = redisClusterConfig.connectTimeout
    ? Number(redisClusterConfig.connectTimeout)
    : DEFAULT_CONNECT_TIMEOUT;
  const family = redisClusterConfig.family
    ? Number(redisClusterConfig.family)
    : DEFAULT_FAMILY;
  const keepAlive = redisClusterConfig.keepAlive
    ? Number(redisClusterConfig.keepAlive)
    : DEFAULT_KEEP_ALIVE;
  const keyPrefix = redisClusterConfig.keyPrefix ?? DEFAULT_KEY_PREFIX;
  const ttl = redisClusterConfig.ttl
    ? Number(redisClusterConfig.ttl)
    : DEFAULT_TTL_SECONDS;

  const instances: ClusterNode[] = ports.map(
    (port: number): ClusterNode => ({ host, port })
  );

  return {
    host,
    ports,
    instances,
    password,
    username,
    connectTimeout,
    family,
    keepAlive,
    keyPrefix,
    ttl,
    ...(options && { options }),
  };
};

export const getRedisCluster = (
  config: IRedisClusterProviderConfig
): Cluster | undefined => {
  const { instances, options } = config || {};
  const { enableAutoPipelining, showFriendlyErrorStack } = options || {};

  const clusterOptions: ClusterOptions = {
    enableAutoPipelining: enableAutoPipelining ?? false,
    enableOfflineQueue: false,
    enableReadyCheck: true,
    scaleReads: 'slave',
    showFriendlyErrorStack,
    slotsRefreshTimeout: 2000,
  };

  Logger.log(
    `Initializing Redis Cluster Provider with ${instances?.length} instances and auto-pipelining as ${enableAutoPipelining}`
  );

  if (instances && instances.length > 0) {
    return new Redis.Cluster(instances, clusterOptions);
  }

  return undefined;
};

export const validateRedisClusterProviderConfig = (
  config: IRedisClusterProviderConfig
): boolean => {
  const validPorts =
    config.ports.length > 0 &&
    config.ports.every((port: number) => Number.isInteger(port));

  return !!config.host && validPorts;
};

export const isClientReady = (status: string): boolean =>
  status === CLIENT_READY;
