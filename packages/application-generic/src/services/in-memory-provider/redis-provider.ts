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
  db?: string;
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
  db?: number;
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
    db: process.env.REDIS_DB_INDEX,
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || String(6379),
    ttl: process.env.REDIS_CACHE_TTL,
    password: process.env.REDIS_PASSWORD,
    connectTimeout: process.env.REDIS_CONNECT_TIMEOUT,
    keepAlive: process.env.REDIS_KEEP_ALIVE,
    family: process.env.REDIS_FAMILY,
    keyPrefix: process.env.REDIS_CACHE_KEY_PREFIX,
    tls: process.env.REDIS_TLS as ConnectionOptions,
  };

  const db = Number(redisConfig.db);
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
  const tls = redisConfig.tls;

  return {
    db,
    host,
    port,
    password,
    connectTimeout,
    family,
    keepAlive,
    keyPrefix,
    ttl,
    tls,
  };
};

export const getRedisInstance = (): Redis | undefined => {
  const { port, host, ...options } = getRedisProviderConfig();

  if (port && host) {
    return new Redis(port, host, options);
  }

  return undefined;
};
