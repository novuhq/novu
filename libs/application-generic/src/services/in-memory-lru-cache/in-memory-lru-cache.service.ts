import { Injectable } from '@nestjs/common';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { LRUCache } from 'lru-cache';
import { FeatureFlagsService } from '../feature-flags';
import { CacheStoreDataTypeMap, InMemoryLRUCacheStore, STORE_CONFIGS, StoreConfig } from './in-memory-lru-cache.store';

type EntityStore<T = unknown> = {
  cache: LRUCache<string, T>;
  inflightRequests: Map<string, Promise<T>>;
  config: StoreConfig;
};

type GetOptions = {
  environmentId?: string;
  organizationId?: string;
  skipCache?: boolean;
  cacheVariant?: string;
};

const STORES = new Map<string, EntityStore>();

@Injectable()
export class InMemoryLRUCacheService {
  constructor(private featureFlagsService: FeatureFlagsService) {}

  async get<TStore extends InMemoryLRUCacheStore>(
    storeName: TStore,
    key: string,
    fetchFn: () => Promise<CacheStoreDataTypeMap[TStore]>,
    opts?: GetOptions
  ): Promise<CacheStoreDataTypeMap[TStore]> {
    const store = this.getOrCreateStore<CacheStoreDataTypeMap[TStore]>(storeName);
    const isCacheEnabled = await this.isCacheEnabled(store.config, opts);

    if (!isCacheEnabled || opts?.skipCache) {
      return fetchFn();
    }

    const effectiveKey = this.resolveKey(key, opts?.cacheVariant);

    const cached = store.cache.get(effectiveKey);
    if (cached !== undefined) {
      return cached;
    }

    const inflightRequest = store.inflightRequests.get(effectiveKey);
    if (inflightRequest) {
      return inflightRequest;
    }

    const fetchPromise = fetchFn()
      .then((result) => {
        if (result !== null && result !== undefined) {
          store.cache.set(effectiveKey, result);
        }

        return result;
      })
      .finally(() => {
        store.inflightRequests.delete(effectiveKey);
      });

    store.inflightRequests.set(effectiveKey, fetchPromise);

    return fetchPromise;
  }

  getIfCached<TStore extends InMemoryLRUCacheStore>(
    storeName: TStore,
    key: string
  ): CacheStoreDataTypeMap[TStore] | undefined {
    const store = STORES.get(storeName);
    if (!store) {
      return undefined;
    }

    const keyValue = store.cache.get(key) as CacheStoreDataTypeMap[TStore] | undefined;

    return keyValue;
  }

  invalidate(storeName: InMemoryLRUCacheStore, key: string): void {
    const store = STORES.get(storeName);
    if (!store) {
      return;
    }

    for (const cacheKey of store.cache.keys()) {
      if (cacheKey === key || cacheKey.startsWith(`${key}:v:`)) {
        store.cache.delete(cacheKey);
      }
    }
  }

  invalidateAll(storeName: InMemoryLRUCacheStore): void {
    const store = STORES.get(storeName);
    if (store) {
      store.cache.clear();
      store.inflightRequests.clear();
    }
  }

  set<TStore extends InMemoryLRUCacheStore>(
    storeName: TStore,
    key: string,
    value: CacheStoreDataTypeMap[TStore]
  ): void {
    const store = this.getOrCreateStore<CacheStoreDataTypeMap[TStore]>(storeName);
    store.cache.set(key, value);
  }

  private resolveKey(key: string, cacheVariant?: string): string {
    return cacheVariant ? `${key}:v:${cacheVariant}` : key;
  }

  private getOrCreateStore<T>(storeName: InMemoryLRUCacheStore): EntityStore<T> {
    let store = STORES.get(storeName) as EntityStore<T> | undefined;

    if (!store) {
      const config = STORE_CONFIGS[storeName];

      store = {
        cache: new LRUCache<string, T>({
          max: config.max,
          ttl: config.ttl,
        }),
        inflightRequests: new Map<string, Promise<T>>(),
        config,
      };
      STORES.set(storeName, store as EntityStore);
    }

    return store;
  }

  private async isCacheEnabled(config: StoreConfig, opts?: GetOptions): Promise<boolean> {
    if (config.skipFeatureFlag) {
      return true;
    }

    if (!opts?.environmentId && !opts?.organizationId) {
      return false;
    }

    try {
      const flagContext = {
        key: FeatureFlagsKeysEnum.IS_LRU_CACHE_ENABLED,
        defaultValue: false,
        component: config.featureFlagComponent,
        ...(opts.environmentId && { environment: { _id: opts.environmentId } }),
        ...(opts.organizationId && { organization: { _id: opts.organizationId } }),
      };

      const flag = await this.featureFlagsService.getFlag(flagContext);

      return flag;
    } catch {
      return false;
    }
  }
}
