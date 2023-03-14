import Redis from 'ioredis';
import { ConnectionOptions } from 'tls';

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
        password: this.config.password,
        connectTimeout: this.config.connectTimeout ? Number(this.config.connectTimeout) : this.DEFAULT_CONNECT_TIMEOUT,
        keepAlive: this.config.keepAlive ? Number(this.config.keepAlive) : this.DEFAULT_KEEP_ALIVE,
        family: this.config.family ? Number(this.config.family) : this.DEFAULT_FAMILY,
        keyPrefix: this.config.keyPrefix ?? this.DEFAULT_KEY_PREFIX,
        tls: this.config.tls,
      });

      this.client.on('connect', () => {
        console.log('REDIS CONNECTED');
      });

      this.client.on('error', (error) => {
        console.error(error);
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
    this.client.set(key, value);
    this.updateTtl(key, options);
  }

  public async keys(pattern?: string) {
    const ALL_KEYS = '*';
    const queryPattern = pattern ?? ALL_KEYS;

    return this.client.keys(queryPattern);
  }

  public async get(key: string) {
    return this.client.get(key);
  }

  public async del(key: string) {
    return this.client.del([key]);
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

  private updateTtl(key: string, options?: CachingConfig) {
    const seconds = options?.ttl || this.cacheTtl;

    return this.client.expire(key, this.ttlVariant(seconds));
  }

  private ttlVariant(num) {
    const variant = this.TTL_VARIANT_PERCENTAGE * num * Math.random();

    return Math.floor(num - (this.TTL_VARIANT_PERCENTAGE * num) / 2 + variant);
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
