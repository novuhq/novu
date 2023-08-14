import { Logger } from '@nestjs/common';
import { createPool, Pool } from 'generic-pool';

import { QUERY_PREFIX } from './key-builders';
import {
  InMemoryProviderClient,
  InMemoryProviderService,
  Pipeline,
} from '../index';
import { addJitter } from '../../resilience';

const LOG_CONTEXT = 'CacheService';

enum CacheServiceActionsEnum {
  DEL_QUERY = 'delQuery',
  SET_QUERY = 'setQuery',
}

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
  private readonly cacheTtl: number;
  private readonly TTL_VARIANT_PERCENTAGE = 0.1;
  private readonly MIN_CLIENT_POOL = process.env.REDIS_CACHE_MIN_CLIENT_POOL
    ? Number(process.env.REDIS_CACHE_MIN_CLIENT_POOL)
    : 1;
  private readonly MAX_CLIENT_POOL = process.env.REDIS_CACHE_MAX_CLIENT_POOL
    ? Number(process.env.REDIS_CACHE_MAX_CLIENT_POOL)
    : 100;
  private redisPool: Pool<InMemoryProviderClient>;

  constructor(private inMemoryProviderService: InMemoryProviderService) {
    Logger.log('Initiated cache service', LOG_CONTEXT);

    this.initializeClientPool();
    this.cacheTtl = this.inMemoryProviderService.inMemoryProviderConfig.ttl;
  }

  private initializeClientPool() {
    const factory = {
      create: async function () {
        const enableAutoPipelining =
          process.env.REDIS_CACHE_ENABLE_AUTOPIPELINING === 'true';

        const inMemoryProvider = new InMemoryProviderService(
          enableAutoPipelining
        );
        inMemoryProvider.initialize();

        return inMemoryProvider.inMemoryProviderClient;
      },
      destroy: async function (client) {
        Logger.error(client, 'Destroying client ', LOG_CONTEXT);
        client.disconnect();
      },
    };
    const opts = {
      max: this.MAX_CLIENT_POOL,
      min: this.MAX_CLIENT_POOL,
    };

    this.redisPool = createPool(factory, opts);

    this.logStats();
  }

  private logStats() {
    setInterval(
      function (pool: Pool<InMemoryProviderClient>) {
        const size = pool.size;
        const spareResourceCapacity = pool.spareResourceCapacity;
        const borrowed = pool.borrowed;
        const pending = pool.pending;
        const available = pool.available;

        Logger.log(
          {
            poolSize: size,
            inUse: borrowed,
            pending,
            available,
            spareResourceCapacity,
          },
          'Cache service pool stats' +
            `, resources free or in use in the pool: ${size}` +
            `, resources currently in use: ${borrowed}` +
            `, number of callers waiting to acquire a resource: ${pending}` +
            `, number of available resources in the pool: ${available}` +
            `, How many many more resources can the pool create: ${spareResourceCapacity}.`,
          LOG_CONTEXT
        );
      },
      60 * 1000,
      this.redisPool
    );
  }

  async acquireClient() {
    return await this.redisPool.acquire();
  }

  async releaseClient(client: InMemoryProviderClient) {
    return await this.redisPool.release(client);
  }

  public async getStatus() {
    return this.usingClient(async (client) => {
      return client?.status;
    });
  }

  public getTtl() {
    return this.cacheTtl;
  }

  public cacheEnabled(): boolean {
    const isEnabled = this.inMemoryProviderService.isClientReady();
    if (!isEnabled) {
      Logger.log('Cache service is not enabled', LOG_CONTEXT);
    }

    return isEnabled;
  }

  public async set(
    key: string,
    value: string,
    options?: CachingConfig
  ): Promise<string | null> {
    return this.usingClient(async (client) => {
      const result = await client?.set(
        key,
        value,
        'EX',
        this.getTtlInSeconds(options)
      );

      if (result === null) {
        Logger.error(
          `Set operation for key ${key} was not performed`,
          LOG_CONTEXT
        );
      }

      return result;
    });
  }

  public async setQuery(key: string, value: string, options?: CachingConfig) {
    return this.usingClient(async (client) => {
      if (client) {
        const { credentials, query } = splitKey(key);

        const pipeline = client.pipeline();

        pipeline.sadd(credentials, query);
        pipeline.expire(
          credentials,
          this.inMemoryProviderService.inMemoryProviderConfig.ttl +
            this.getTtlInSeconds(options)
        );

        pipeline.set(key, value, 'EX', this.getTtlInSeconds(options));

        await this.capturedExec(
          pipeline,
          CacheServiceActionsEnum.SET_QUERY,
          key
        );
      }
    });
  }

  public async keys(pattern?: string) {
    const ALL_KEYS = '*';
    const queryPattern = pattern ?? ALL_KEYS;

    return this.usingClient(async (client) => {
      return await client?.keys(queryPattern);
    });
  }

  public async get(key: string) {
    return this.usingClient(async (client) => {
      return await client.get(key);
    });
  }

  public async del(key: string | string[]) {
    const keys = Array.isArray(key) ? key : [key];

    return this.usingClient(async (client) => {
      return await client?.del(keys);
    });
  }

  public async delQuery(key: string) {
    return this.usingClient(async (client) => {
      if (client) {
        const queries = await client.smembers(key);

        if (queries.length === 0) return;

        const pipeline = client.pipeline();
        // invalidate queries
        queries.forEach(function (query) {
          const fullKey = `${key}:${QUERY_PREFIX}=${query}`;
          pipeline.del(fullKey);
        });
        // invalidate queries set
        pipeline.del(key);

        await this.capturedExec(
          pipeline,
          CacheServiceActionsEnum.DEL_QUERY,
          key
        );
      }
    });
  }

  private async capturedExec(
    pipeline: Pipeline,
    action: CacheServiceActionsEnum,
    key: string
  ): Promise<void> {
    try {
      await pipeline.exec();
    } catch (error) {
      Logger.error(
        error,
        `Failed to execute pipeline action ${action} for key ${key}`,
        LOG_CONTEXT
      );
      throw error;
    }
  }

  public async delByPattern(pattern: string) {
    return this.usingClient(async (client) => {
      if (client) {
        return new Promise((resolve, reject) => {
          const stream = this.inMemoryProviderService.inMemoryScan(pattern);

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
    });
  }

  private getTtlInSeconds(options?: CachingConfig): number {
    const seconds = options?.ttl || this.cacheTtl;

    return addJitter(seconds, this.TTL_VARIANT_PERCENTAGE);
  }

  private async usingClient<T>(
    handler: (client: InMemoryProviderClient) => Promise<T>
  ): Promise<T> {
    const client = await this.acquireClient();

    try {
      return await handler(client);
    } catch (error) {
      Logger.error(
        error,
        `Unexpected exception occurred while handling use client`,
        LOG_CONTEXT
      );
      throw error;
    } finally {
      await this.releaseClient(client);
    }
  }
}

export function splitKey(key: string) {
  const keyDelimiter = `:${QUERY_PREFIX}=`;
  const keyParts = key.split(keyDelimiter);
  const credentials = keyParts[0];
  const query = keyParts[1];

  return { credentials, query };
}
