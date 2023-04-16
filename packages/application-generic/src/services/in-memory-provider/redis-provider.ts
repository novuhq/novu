import Redis, { RedisOptions } from 'ioredis';
import { ConnectionOptions } from 'tls';

export { Redis, RedisOptions };

export const CLIENT_READY = 'ready';
const DEFAULT_TTL_SECONDS = 60 * 60 * 2;
const DEFAULT_CONNECT_TIMEOUT = 50000;
const DEFAULT_KEEP_ALIVE = 30000;
const DEFAULT_FAMILY = 4;
const DEFAULT_KEY_PREFIX = '';
const TTL_VARIANT_PERCENTAGE = 0.1;

interface IRedisConfig {
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

export interface IRedisProviderConfig {
  connectTimeout: number;
  family: number;
  host?: string;
  keepAlive: number;
  keyPrefix: string;
  password?: string;
  port?: number;
  tls?: ConnectionOptions;
  ttl: number;
}

export const getRedisProviderConfig = (): IRedisProviderConfig => {
  const redisConfig: IRedisConfig = {
    host: process.env.REDIS_CACHE_SERVICE_HOST,
    port: process.env.REDIS_CACHE_SERVICE_PORT || String(6379),
    ttl: process.env.REDIS_CACHE_TTL,
    password: process.env.REDIS_CACHE_PASSWORD,
    connectTimeout: process.env.REDIS_CACHE_CONNECTION_TIMEOUT,
    keepAlive: process.env.REDIS_CACHE_KEEP_ALIVE,
    family: process.env.REDIS_CACHE_FAMILY,
    keyPrefix: process.env.REDIS_CACHE_KEY_PREFIX,
    tls: process.env.REDIS_CACHE_SERVICE_TLS as ConnectionOptions,
  };

  const port = Number(redisConfig.port);
  const host = redisConfig.host;
  const password = redisConfig.password;
  const connectTimeout = redisConfig.connectTimeout
    ? Number(redisConfig.connectTimeout)
    : DEFAULT_CONNECT_TIMEOUT;
  const family = redisConfig.family
    ? Number(redisConfig.family)
    : DEFAULT_FAMILY;
  const keepAlive = redisConfig.keepAlive
    ? Number(redisConfig.keepAlive)
    : DEFAULT_KEEP_ALIVE;
  const keyPrefix = redisConfig.keyPrefix ?? DEFAULT_KEY_PREFIX;
  const ttl = redisConfig.ttl ? Number(redisConfig.ttl) : DEFAULT_TTL_SECONDS;

  return {
    host,
    port,
    password,
    connectTimeout,
    family,
    keepAlive,
    keyPrefix,
    ttl,
  };
};

export const getRedisInstance = (): Redis | undefined => {
  const { port, host, ...options } = getRedisProviderConfig();

  if (port && host) {
    return new Redis(port, host, options);
  }

  return undefined;
};
