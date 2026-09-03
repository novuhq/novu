import { Logger } from '@nestjs/common';
import Redis, { ChainableCommander, Cluster, ClusterNode, ClusterOptions } from 'ioredis';
import { ConnectionOptions } from 'tls';

import { convertStringValues, isTlsFlagEnabled } from './variable-mappers';

export { ChainableCommander, Cluster, ClusterOptions };

export const CLIENT_READY = 'ready';
const DEFAULT_TTL_SECONDS = 60 * 60 * 2;
const DEFAULT_CONNECT_TIMEOUT = 50000;
const DEFAULT_KEEP_ALIVE = 30000;
const DEFAULT_FAMILY = 4;
const DEFAULT_KEY_PREFIX = '';

interface IRedisClusterConfig {
  connectTimeout?: string;
  family?: string;
  host?: string;
  keepAlive?: string;
  keyPrefix?: string;
  username?: string;
  password?: string;
  port?: string;
  ports?: string;
  tls?: ConnectionOptions;
  ttl?: string;
}

export interface IRedisClusterProviderConfig {
  connectTimeout: number;
  family: number;
  host?: string;
  instances?: ClusterNode[];
  keepAlive: number;
  keyPrefix: string;
  username?: string;
  password?: string;
  ports?: number[];
  tls?: ConnectionOptions;
  ttl: number;
}

export const parseRedisClusterPorts = (ports?: string, port?: string): number[] => {
  if (ports) {
    try {
      const parsed = JSON.parse(ports);
      if (Array.isArray(parsed)) {
        return parsed.map(Number);
      }
      if (typeof parsed === 'number') {
        return [parsed];
      }
    } catch {
      return ports
        .split(',')
        .map((value) => Number(value.trim()))
        .filter((value) => Number.isInteger(value));
    }
  }

  if (port) {
    const parsedPort = Number(port);
    if (Number.isInteger(parsedPort)) {
      return [parsedPort];
    }
  }

  return [];
};

export const parseRedisClusterHosts = (host?: string): string[] => {
  if (!host) {
    return [];
  }

  return host
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
};

export const buildRedisClusterInstances = (hosts: string[], ports: number[]): ClusterNode[] => {
  if (hosts.length === 0 || ports.length === 0) {
    return [];
  }

  if (hosts.length === 1) {
    return ports.map((port) => ({ host: hosts[0], port }));
  }

  if (ports.length === 1) {
    return hosts.map((clusterHost) => ({ host: clusterHost, port: ports[0] }));
  }

  const length = Math.min(hosts.length, ports.length);

  return hosts.slice(0, length).map((clusterHost, index) => ({ host: clusterHost, port: ports[index] }));
};

export const getRedisClusterProviderConfig = (): IRedisClusterProviderConfig => {
  const redisClusterConfig: IRedisClusterConfig = {
    host: convertStringValues(process.env.REDIS_CLUSTER_SERVICE_HOST),
    port: convertStringValues(process.env.REDIS_CLUSTER_SERVICE_PORT),
    ports: convertStringValues(process.env.REDIS_CLUSTER_SERVICE_PORTS),
    ttl: convertStringValues(process.env.REDIS_CLUSTER_TTL),
    username: convertStringValues(process.env.REDIS_CLUSTER_USERNAME),
    password: convertStringValues(process.env.REDIS_CLUSTER_PASSWORD),
    connectTimeout: convertStringValues(process.env.REDIS_CLUSTER_CONNECTION_TIMEOUT),
    keepAlive: convertStringValues(process.env.REDIS_CLUSTER_KEEP_ALIVE),
    family: convertStringValues(process.env.REDIS_CLUSTER_FAMILY),
    keyPrefix: convertStringValues(process.env.REDIS_CLUSTER_KEY_PREFIX),
    tls: isTlsFlagEnabled(process.env.REDIS_CLUSTER_TLS)
      ? {
          servername: convertStringValues(process.env.REDIS_CLUSTER_SERVICE_HOST)?.split(',')[0]?.trim(),
        }
      : undefined,
  };

  const hosts = parseRedisClusterHosts(redisClusterConfig.host);
  const ports = parseRedisClusterPorts(redisClusterConfig.ports, redisClusterConfig.port);
  const { username } = redisClusterConfig;
  const { password } = redisClusterConfig;
  const connectTimeout = redisClusterConfig.connectTimeout
    ? Number(redisClusterConfig.connectTimeout)
    : DEFAULT_CONNECT_TIMEOUT;
  const family = redisClusterConfig.family ? Number(redisClusterConfig.family) : DEFAULT_FAMILY;
  const keepAlive = redisClusterConfig.keepAlive ? Number(redisClusterConfig.keepAlive) : DEFAULT_KEEP_ALIVE;
  const keyPrefix = redisClusterConfig.keyPrefix ?? DEFAULT_KEY_PREFIX;
  const ttl = redisClusterConfig.ttl ? Number(redisClusterConfig.ttl) : DEFAULT_TTL_SECONDS;
  const instances = buildRedisClusterInstances(hosts, ports);

  return {
    host: redisClusterConfig.host,
    ports,
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

export const getRedisCluster = (enableAutoPipelining?: boolean): Cluster | undefined => {
  const { instances, password, username, tls, connectTimeout } = getRedisClusterProviderConfig();

  const skipVersionCheck = process.env.REDIS_SKIP_VERSION_CHECK === 'true';

  const redisOptions: any = {
    maxRetriesPerRequest: null,
    ...(tls && { tls }),
    connectTimeout,
    skipVersionCheck,
  };

  if (username && password) {
    redisOptions.username = username;
    redisOptions.password = password;
    Logger.log('Configuring Redis Cluster with ACL authentication');
  } else if (password) {
    redisOptions.password = password;
    Logger.log('Configuring Redis Cluster with password-only authentication');
  } else if (username) {
    throw new Error('Redis Cluster misconfiguration: username provided without password');
  }

  const options: ClusterOptions = {
    dnsLookup: (address, callback) => callback(null, address),
    enableAutoPipelining: enableAutoPipelining ?? false,
    enableOfflineQueue: false,
    enableReadyCheck: true,
    redisOptions,
    clusterRetryStrategy: (times: number) => {
      return Math.max(Math.min(Math.exp(times), 20000), 1000);
    },
    /*
     * Queue Lua scripts and writes must hit masters. Replica reads break BullMQ
     * (CROSSSLOT / READONLY) even when the same cluster is used as a cache fallback.
     */
    scaleReads: 'master',
    /*
     *  Disabled in Prod as affects performance
     */
    showFriendlyErrorStack: process.env.NODE_ENV !== 'production',
    slotsRefreshTimeout: 2000,
  };

  Logger.log(
    `Initializing Redis Cluster Provider with ${instances?.length} instances and auto-pipelining as ${options.enableAutoPipelining}`
  );

  if (instances && instances.length > 0) {
    return new Redis.Cluster(instances, options);
  }

  return undefined;
};

export const validateRedisClusterProviderConfig = (): boolean => {
  const config = getRedisClusterProviderConfig();

  const validPorts =
    config.ports && config.ports.length > 0 && config.ports.every((port: number) => Number.isInteger(port));

  return !!config.host && !!validPorts && (config.instances?.length ?? 0) > 0;
};

export const isClientReady = (status: string): boolean => status === CLIENT_READY;
