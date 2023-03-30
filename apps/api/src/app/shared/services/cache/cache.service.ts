import Redis from 'ioredis';
import { ConnectionOptions } from 'tls';
import { Logger } from '@nestjs/common';
import { QUERY_PREFIX } from './key-builders/shared';

const STORE_CONNECTED = 'ready';

export interface ICacheService {
  set(key: string, value: string, options?: CachingConfig);
  get(key: string);
  del(key: string);
  delByPattern(pattern: string);
  keys(pattern?: string);
  getStatus();
  cacheEnabled();
}

export type CachingConfig = {
  ttl?: number;
};

export class CacheService implements ICacheService {
  private readonly DEFAULT_TTL_SECONDS = 60 * 60 * 2;
  private readonly DEFAULT_CONNECT_TIMEOUT = 50000;
  private readonly DEFAULT_KEEP_ALIVE = 30000;
  private readonly DEFAULT_FAMILY = 4;
  private readonly DEFAULT_KEY_PREFIX = '';
  private readonly TTL_VARIANT_PERCENTAGE = 0.1;

  private readonly client: Redis;
  private readonly cacheTtl: number;

  constructor(private config: ICacheServiceConfig) {
    if (!this.config.host) {
      console.log('Caching is not enabled for the API Service');
    }

    if (this.config.host) {
      console.log('Connecting to ' + this.config.host + ':' + this.config.port);

      this.client = new Redis(Number(this.config.port || 6379), this.config.host, {
        password: this.config.password ?? undefined,
        connectTimeout: this.config.connectTimeout ? Number(this.config.connectTimeout) : this.DEFAULT_CONNECT_TIMEOUT,
        keepAlive: this.config.keepAlive ? Number(this.config.keepAlive) : this.DEFAULT_KEEP_ALIVE,
        family: this.config.family ? Number(this.config.family) : this.DEFAULT_FAMILY,
        keyPrefix: this.config.keyPrefix ?? this.DEFAULT_KEY_PREFIX,
        tls: this.config.tls,
      });

      this.client.on('connect', () => {
        Logger.log('REDIS CONNECTED');
      });

      this.client.on('error', (error) => {
        Logger.error(error);
      });

      this.cacheTtl = this.config.ttl ? Number(this.config.ttl) : this.DEFAULT_TTL_SECONDS;
    }
  }

  public getStatus() {
    return this.client?.status;
  }

  public cacheEnabled() {
    return this.client?.status === STORE_CONNECTED;
  }

  public async set(key: string, value: string, options?: CachingConfig) {
    this.client.set(key, value, 'EX', this.getTtlInSeconds(options));
  }

  public async setQuery(key: string, value: string, options?: CachingConfig) {
    const { credentials, query } = this.splitKey(key);

    const pipeline = this.client.pipeline();

    pipeline.sadd(credentials, query);
    pipeline.expire(credentials, this.DEFAULT_TTL_SECONDS + this.getTtlInSeconds(options));

    pipeline.set(key, value, 'EX', this.getTtlInSeconds(options));
    await pipeline.exec();
  }

  public async keys(pattern?: string) {
    const ALL_KEYS = '*';
    const queryPattern = pattern ?? ALL_KEYS;

    return this.client.keys(queryPattern);
  }

  public async get(key: string) {
    return this.client.get(key);
  }

  public async del(key: string | string[]) {
    const keys = Array.isArray(key) ? key : [key];

    return this.client.del(keys);
  }

  public async delQuery(key: string) {
    const queries = await this.client.smembers(key);

    if (queries.length === 0) return;

    const pipeline = this.client.pipeline();
    // invalidate queries
    queries.forEach(function (query) {
      const fullKey = `${key}:${QUERY_PREFIX}=${query}`;
      pipeline.del(fullKey);
    });
    // invalidate queries set
    pipeline.del(key);
    await pipeline.exec();
  }

  public delByPattern(pattern: string) {
    return new Promise((resolve, reject) => {
      const client = this.client;
      const stream = client.scanStream({
        match: pattern,
      });

      stream.on('data', function (keys) {
        if (keys.length) {
          const pipeline = client.pipeline();
          keys.forEach(function (key) {
            pipeline.del(key);
          });
          pipeline.exec().then(resolve).catch(reject);
        }
      });
      stream.on('end', () => {
        resolve(undefined);
      });
      stream.on('error', (err) => {
        reject(err);
      });
    });
  }

  private getTtlInSeconds(options?: CachingConfig): number {
    const seconds = options?.ttl || this.cacheTtl;

    return this.ttlVariant(seconds);
  }

  private ttlVariant(num): number {
    const variant = this.TTL_VARIANT_PERCENTAGE * num * Math.random();

    return Math.floor(num - (this.TTL_VARIANT_PERCENTAGE * num) / 2 + variant);
  }

  private splitKey(key: string) {
    const keyDelimiter = `:${QUERY_PREFIX}=`;
    const keyParts = key.split(keyDelimiter);
    const credentials = keyParts[0];
    const query = keyParts[1];

    return { credentials, query };
  }
}

export interface ICacheServiceConfig {
  host?: string;
  port: string;
  ttl?: string;
  password?: string;
  connectTimeout?: string;
  keepAlive?: string;
  family?: string;
  keyPrefix?: string;
  tls?: ConnectionOptions;
}
