import { Injectable, Logger } from '@nestjs/common';

import { QUERY_PREFIX } from './key-builders';
import {
  CacheInMemoryProviderService,
  InMemoryProviderClient,
  Pipeline,
} from '../in-memory-provider';
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
  sadd(key: string, ...members: (string | number | Buffer)[]): Promise<number>;
  eval<TData = unknown>(
    script: string,
    keys: string[],
    args: (string | number | Buffer)[]
  ): Promise<TData>;
}

export type CachingConfig = {
  ttl?: number;
};

export class CacheService implements ICacheService {
  private cacheTtl: number;
  private readonly TTL_VARIANT_PERCENTAGE = 0.1;

  constructor(
    private cacheInMemoryProviderService: CacheInMemoryProviderService
  ) {}

  public async initialize(): Promise<void> {
    Logger.log('Initiated cache service', LOG_CONTEXT);

    await this.cacheInMemoryProviderService.initialize();

    this.cacheTtl = this.cacheInMemoryProviderService.getTtl();
  }

  public get client(): InMemoryProviderClient {
    return this.cacheInMemoryProviderService.getClient();
  }

  public getStatus(): string {
    return this.cacheInMemoryProviderService.getClientStatus();
  }

  public getTtl(): number {
    return this.cacheTtl;
  }

  public cacheEnabled(): boolean {
    const isEnabled = this.cacheInMemoryProviderService.isReady();
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
    const result = await this.client?.set(
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
  }

  public async setIfNotExist(
    key: string,
    value: string,
    options?: CachingConfig
  ): Promise<string | null> {
    const result = await this.client?.set(
      key,
      value,
      'EX',
      this.getTtlInSeconds(options),
      'NX'
    );

    return result;
  }

  public async setQuery(
    key: string,
    value: string,
    options?: CachingConfig
  ): Promise<void | unknown[]> {
    if (this.client) {
      const { credentials, query } = splitKey(key);

      const pipeline = this.client.pipeline();

      pipeline.sadd(credentials, query);
      pipeline.expire(
        credentials,
        this.cacheInMemoryProviderService.getTtl() +
          this.getTtlInSeconds(options)
      );

      pipeline.set(key, value, 'EX', this.getTtlInSeconds(options));

      return await this.capturedExec(
        pipeline,
        CacheServiceActionsEnum.SET_QUERY,
        key
      );
    }
  }

  public async keys(pattern?: string): Promise<string[]> {
    const ALL_KEYS = '*';
    const queryPattern = pattern ?? ALL_KEYS;

    return this.client?.keys(queryPattern);
  }

  public async get(key: string): Promise<string> {
    return this.client?.get(key);
  }

  public async del(key: string | string[]): Promise<number> {
    const keys = Array.isArray(key) ? key : [key];

    return this.client?.del(keys);
  }

  public async delQuery(key: string): Promise<void | unknown[]> {
    if (this.client) {
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

      return await this.capturedExec(
        pipeline,
        CacheServiceActionsEnum.DEL_QUERY,
        key
      );
    }
  }

  private async capturedExec(
    pipeline: Pipeline,
    action: CacheServiceActionsEnum,
    key: string
  ): Promise<unknown[]> {
    try {
      return await pipeline.exec();
    } catch (error) {
      Logger.error(
        error,
        `Failed to execute pipeline action ${action} for key ${key}`,
        LOG_CONTEXT
      );
      throw error;
    }
  }

  public delByPattern(pattern: string): Promise<unknown> {
    const client = this.client;

    if (client) {
      return new Promise((resolve, reject) => {
        const stream = this.cacheInMemoryProviderService.inMemoryScan(pattern);

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
  }

  private getTtlInSeconds(options?: CachingConfig): number {
    const seconds = options?.ttl || this.cacheTtl;

    return addJitter(seconds, this.TTL_VARIANT_PERCENTAGE);
  }

  public async sadd(
    key: string,
    ...members: (string | number | Buffer)[]
  ): Promise<number> {
    return this.client?.sadd(key, ...members);
  }

  public async eval<TData = unknown>(
    script: string,
    keys: string[],
    args: (string | number | Buffer)[]
  ): Promise<TData> {
    return this.client?.eval(
      script,
      keys.length,
      ...keys,
      ...args
    ) as Promise<TData>;
  }
}

export function splitKey(key: string) {
  const keyDelimiter = `:${QUERY_PREFIX}=`;
  const keyParts = key.split(keyDelimiter);
  const credentials = keyParts[0];
  const query = keyParts[1];

  return { credentials, query };
}
