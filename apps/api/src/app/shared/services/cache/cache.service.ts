import Redis from 'ioredis';
import { getRedisPrefix } from '@novu/shared';

interface ICacheService {
  set(key: string, value: string, options?: CachingConfig);
  get(key: string);
  del(key: string);
  reset();
}

export type CachingConfig = {
  ttl?: number;
};

export class CacheService {
  private readonly client: Redis;
  private readonly DEFAULT_TTL = 60;

  constructor() {
    this.client = new Redis(Number(process.env.REDIS_PORT), process.env.REDIS_HOST, {
      password: process.env.REDIS_PASSWORD,
      connectTimeout: 50000,
      keepAlive: 30000,
      family: 4,
      keyPrefix: getRedisPrefix(),
    });
  }

  public async set(key: string, value: string, options?: CachingConfig) {
    this.client.set(key, value);
    this.updateTtl(key, options);
  }

  public async keys(pattern = '*') {
    return this.client.keys(pattern);
  }

  public async get(key: string) {
    return this.client.get(key);
  }

  public async del(key: string) {
    return this.client.del([key]);
  }

  public async delByPattern(pattern: string) {
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

  public async reset() {
    return this.client.reset();
  }

  private updateTtl(key: string, options?: CachingConfig) {
    const seconds = options?.ttl || this.DEFAULT_TTL;

    return this.client.expire(key, seconds);
  }
}
