import Redis, { Cluster, ClusterNode, ClusterOptions, NodeRole } from 'ioredis';
import { ConnectionOptions } from 'tls';
import { Logger } from '@nestjs/common';

import { convertStringValues } from './variable-mappers';

export { Cluster, ClusterOptions };

export const CLIENT_READY = 'ready';
const DEFAULT_TTL_SECONDS = 60 * 60 * 2;
const DEFAULT_CONNECT_TIMEOUT = 50000;
const DEFAULT_KEEP_ALIVE = 30000;
const DEFAULT_FAMILY = 4;
const DEFAULT_KEY_PREFIX = '';

interface IRedisMasterSlaveConfig {
  connectTimeout?: string;
  family?: string;
  masterHost?: string;
  masterPort?: string;
  slaveHost?: string;
  slavePort?: string;
  keepAlive?: string;
  keyPrefix?: string;
  password?: string;
  tls?: ConnectionOptions;
  ttl?: string;
}

export interface IRedisMasterSlaveProviderConfig {
  connectTimeout: number;
  family: number;
  host?: string; // Master host (for compatibility with generic provider interface)
  port?: number; // Master port (for compatibility with generic provider interface)
  masterHost?: string;
  masterPort?: number;
  slaveHost?: string;
  slavePort?: number;
  instances?: ClusterNode[];
  keepAlive: number;
  keyPrefix: string;
  password?: string;
  username?: string;
  tls?: ConnectionOptions;
  ttl: number;
}

export const getRedisMasterSlaveProviderConfig = (): IRedisMasterSlaveProviderConfig => {
  const redisMasterSlaveConfig: IRedisMasterSlaveConfig = {
    masterHost: convertStringValues(process.env.REDIS_MASTER_HOST),
    masterPort: convertStringValues(process.env.REDIS_MASTER_PORT),
    slaveHost: convertStringValues(process.env.REDIS_SLAVE_HOST),
    slavePort: convertStringValues(process.env.REDIS_SLAVE_PORT),
    ttl: convertStringValues(process.env.REDIS_CLUSTER_TTL),
    password: convertStringValues(process.env.REDIS_CLUSTER_PASSWORD),
    connectTimeout: convertStringValues(process.env.REDIS_CLUSTER_CONNECTION_TIMEOUT),
    keepAlive: convertStringValues(process.env.REDIS_CLUSTER_KEEP_ALIVE),
    family: convertStringValues(process.env.REDIS_CLUSTER_FAMILY),
    keyPrefix: convertStringValues(process.env.REDIS_CLUSTER_KEY_PREFIX),
    tls: (process.env.REDIS_CLUSTER_TLS as ConnectionOptions)
      ? {
          servername: convertStringValues(process.env.REDIS_MASTER_HOST),
        }
      : {},
  };

  const { masterHost, slaveHost } = redisMasterSlaveConfig;
  const masterPort = redisMasterSlaveConfig.masterPort ? Number(redisMasterSlaveConfig.masterPort) : 6379;
  // If slave port not specified, default to 6379 or same as master port if master port is custom
  let slavePort = 6379;
  if (redisMasterSlaveConfig.slavePort) {
    slavePort = Number(redisMasterSlaveConfig.slavePort);
  } else if (redisMasterSlaveConfig.masterPort) {
    slavePort = masterPort;
  }
  const { password } = redisMasterSlaveConfig;
  const connectTimeout = redisMasterSlaveConfig.connectTimeout
    ? Number(redisMasterSlaveConfig.connectTimeout)
    : DEFAULT_CONNECT_TIMEOUT;
  const family = redisMasterSlaveConfig.family ? Number(redisMasterSlaveConfig.family) : DEFAULT_FAMILY;
  const keepAlive = redisMasterSlaveConfig.keepAlive ? Number(redisMasterSlaveConfig.keepAlive) : DEFAULT_KEEP_ALIVE;
  const keyPrefix = redisMasterSlaveConfig.keyPrefix ?? DEFAULT_KEY_PREFIX;
  const ttl = redisMasterSlaveConfig.ttl ? Number(redisMasterSlaveConfig.ttl) : DEFAULT_TTL_SECONDS;

  // Create instances array with master and slave nodes
  const instances: ClusterNode[] = [];

  // Master is required
  if (masterHost && masterPort) {
    instances.push({ host: masterHost, port: masterPort });
  }

  // Slave is optional - if not provided, will work as single master
  if (slaveHost && slavePort) {
    instances.push({ host: slaveHost, port: slavePort });
  }

  return {
    host: masterHost, // Alias for masterHost (for compatibility)
    port: masterPort, // Alias for masterPort (for compatibility)
    masterHost,
    masterPort,
    slaveHost,
    slavePort,
    instances,
    password,
    connectTimeout,
    family,
    keepAlive,
    keyPrefix,
    ttl,
    tls: redisMasterSlaveConfig.tls,
  };
};

export const getRedisMasterSlaveCluster = (enableAutoPipelining?: boolean): Cluster | undefined => {
  const { instances, password, tls } = getRedisMasterSlaveProviderConfig();

  const options: ClusterOptions = {
    enableAutoPipelining: enableAutoPipelining ?? false,
    enableOfflineQueue: false,
    enableReadyCheck: true,
    redisOptions: {
      tls,
      ...(password && { password }),
      connectTimeout: 10000,
    },
    // Scale reads to slave nodes for better performance
    scaleReads: 'slave',
    /*
     *  Disabled in Prod as affects performance
     */
    showFriendlyErrorStack: process.env.NODE_ENV !== 'production',
    slotsRefreshTimeout: 10000,
  };

  Logger.log(
    `Initializing Redis Master-Slave Provider with ${instances?.length} instances ` +
      `(master-slave setup) and auto-pipelining as ${options.enableAutoPipelining}`
  );

  if (instances && instances.length > 0) {
    return new Redis.Cluster(instances, options);
  }

  return undefined;
};

export const validateRedisMasterSlaveProviderConfig = (): boolean => {
  const config = getRedisMasterSlaveProviderConfig();

  // Only master host is required, everything else has sensible defaults
  const hasMaster = !!config.masterHost;
  const hasSlave = !!config.slaveHost;

  Logger.log(
    `Redis Master-Slave validation: Master ${hasMaster ? 'configured' : 'missing'}, ` +
      `Slave ${hasSlave ? 'configured' : 'not configured (will use master-only mode)'}`
  );

  return hasMaster;
};

export const isClientReady = (status: string): boolean => status === CLIENT_READY;
