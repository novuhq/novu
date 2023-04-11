import Redis, { Cluster, ClusterNode, ClusterOptions, NatMap } from 'ioredis';
import { ConnectionOptions } from 'tls';

export { Cluster, ClusterOptions };

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
}

export interface IRedisClusterProviderConfig {
  connectTimeout: number;
  family: number;
  host?: string;
  instances?: ClusterNode[];
  keepAlive: number;
  keyPrefix: string;
  password?: string;
  ports?: number[];
  tls?: ConnectionOptions;
  ttl: number;
}

export const getRedisClusterProviderConfig = (): IRedisClusterProviderConfig => {
  const redisClusterConfig: IRedisClusterConfig = {
    host: process.env.REDIS_CLUSTER_SERVICE_HOST,
    ports: process.env.REDIS_CLUSTER_SERVICE_PORTS,
    ttl: process.env.REDIS_CLUSTER_TTL,
    password: process.env.REDIS_CLUSTER_PASSWORD,
    connectTimeout: process.env.REDIS_CLUSTER_CONNECTION_TIMEOUT,
    keepAlive: process.env.REDIS_CLUSTER_KEEP_ALIVE,
    family: process.env.REDIS_CLUSTER_FAMILY,
    keyPrefix: process.env.REDIS_CLUSTER_KEY_PREFIX,
    tls: process.env.REDIS_CLUSTER_TLS as ConnectionOptions,
  };

  const host = redisClusterConfig.host;
  const ports = redisClusterConfig.ports ? JSON.parse(redisClusterConfig.ports) : [];
  const password = redisClusterConfig.password;
  const connectTimeout = redisClusterConfig.connectTimeout
    ? Number(redisClusterConfig.connectTimeout)
    : DEFAULT_CONNECT_TIMEOUT;
  const family = redisClusterConfig.family ? Number(redisClusterConfig.family) : DEFAULT_FAMILY;
  const keepAlive = redisClusterConfig.keepAlive ? Number(redisClusterConfig.keepAlive) : DEFAULT_KEEP_ALIVE;
  const keyPrefix = redisClusterConfig.keyPrefix ?? DEFAULT_KEY_PREFIX;
  const ttl = redisClusterConfig.ttl ? Number(redisClusterConfig.ttl) : DEFAULT_TTL_SECONDS;

  const instances: ClusterNode[] = [process.env.REDIS_CACHE_CLUSTER_URL as string];

  return {
    host,
    ports,
    instances,
    password,
    connectTimeout,
    family,
    keepAlive,
    keyPrefix,
    ttl,
  };
};

export const getRedisCluster = (): Cluster | undefined => {
  const { instances } = getRedisClusterProviderConfig();

  const natMap = instances?.reduce((acc: NatMap, instance: any): NatMap => {
    return {
      ...acc,
      [`${instance.host}:${instance.port}`]: { host: instance.host as string, port: instance.port as number },
    };
  }, {});

  const options: ClusterOptions = {
    /*
     * natMap,
     *  Disabled in Prod as affects performance
     */
    showFriendlyErrorStack: process.env.NODE_ENV !== 'prod',
  };

  if (instances && instances.length > 0) {
    return new Redis.Cluster(instances, options);
  }

  return undefined;
};
