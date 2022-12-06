import Redis from 'ioredis';

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
  private readonly DEFAULT_TTL_SECONDS = 60;
  private readonly DEFAULT_CACHE_CONNECT_TIMEOUT = 50000;
  private readonly DEFAULT_CACHE_KEEP_ALIVE = 30000;
  private readonly DEFAULT_CACHE_FAMILY = 4;
  private readonly DEFAULT_CACHE_KEY_PREFIX = '';

  private readonly client: Redis;
  private readonly cacheTtl: number;

  constructor(
    private config: {
      cachePort: string;
      cacheHost: string;
      cachePassword?: string;
      cacheConnectTimeout?: string;
      cacheKeepAlive?: string;
      cacheFamily?: string;
      cacheKeyPrefix?: string;
      cacheTtl?: string;
    }
  ) {
    if (this.config.cachePort && this.config.cacheHost) {
      this.client = new Redis(Number(this.config.cachePort), this.config.cacheHost, {
        password: this.config.cachePassword,
        connectTimeout: this.config.cacheConnectTimeout
          ? Number(this.config.cacheConnectTimeout)
          : this.DEFAULT_CACHE_CONNECT_TIMEOUT,
        keepAlive: this.config.cacheKeepAlive ? Number(this.config.cacheKeepAlive) : this.DEFAULT_CACHE_KEEP_ALIVE,
        family: this.config.cacheFamily ? Number(this.config.cacheFamily) : this.DEFAULT_CACHE_FAMILY,
        keyPrefix: this.config.cacheKeyPrefix ?? this.DEFAULT_CACHE_KEY_PREFIX,
      });

      this.cacheTtl = this.config.cacheTtl ? Number(this.config.cacheTtl) : this.DEFAULT_TTL_SECONDS;
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
        pipeline.exec();
      }
    });
  }

  private updateTtl(key: string, options?: CachingConfig) {
    const seconds = options?.ttl || this.cacheTtl;

    return this.client.expire(key, seconds);
  }
}
