import { Injectable } from '@nestjs/common';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { LRUCache } from 'lru-cache';
import { FeatureFlagsService } from '../feature-flags';
import { CacheStoreDataTypeMap, InMemoryLRUCacheStore, STORE_CONFIGS, StoreConfig } from './in-memory-lru-cache.store';

type EntityStore<T = unknown> = {
  cache: LRUCache<string, T>;
  /**
   * In-flight fetches keyed by effective cache key, shared by `get()` and `getMany()` so
   * concurrent callers coalesce onto one fetch. The resolved value is `T | undefined` because
   * `getMany()` registers a promise per requested key and a batch fetch may legitimately omit a
   * key (resolving `undefined`); `get()` treats an `undefined` resolution as a miss and falls
   * back to its own fetch, so the two methods can safely share a store.
   */
  inflightRequests: Map<string, Promise<T | undefined>>;
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
      const inflightResult = await inflightRequest;
      if (inflightResult !== undefined) {
        return inflightResult;
      }
      // A shared `getMany()` batch had no value for this key — fall through to our own fetch.
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

  /**
   * Batch variant of `get()` that resolves many keys at once while preserving the same
   * caching and in-flight coalescing semantics per key:
   * - cache hits are served from memory,
   * - keys with an in-flight fetch (from this or a concurrent call) reuse that promise,
   * - only the remaining keys are passed to `fetchMissing` in a single call.
   *
   * This keeps the cold-cache/TTL-expiry path stampede-safe (K concurrent callers for the same
   * key set trigger one `fetchMissing` per key, not K), which a manual `getIfCached()` + `set()`
   * loop would lose. `fetchMissing` is expected to return an entry for every requested key.
   */
  async getMany<TStore extends InMemoryLRUCacheStore>(
    storeName: TStore,
    keys: string[],
    fetchMissing: (missingKeys: string[]) => Promise<Map<string, CacheStoreDataTypeMap[TStore]>>,
    opts?: GetOptions
  ): Promise<Map<string, CacheStoreDataTypeMap[TStore]>> {
    const result = new Map<string, CacheStoreDataTypeMap[TStore]>();

    if (keys.length === 0) {
      return result;
    }

    const store = this.getOrCreateStore<CacheStoreDataTypeMap[TStore]>(storeName);
    const isCacheEnabled = await this.isCacheEnabled(store.config, opts);

    if (!isCacheEnabled || opts?.skipCache) {
      return fetchMissing(keys);
    }

    const pending: Array<{ key: string; promise: Promise<CacheStoreDataTypeMap[TStore] | undefined> }> = [];
    const missingKeys: string[] = [];

    for (const key of keys) {
      const effectiveKey = this.resolveKey(key, opts?.cacheVariant);

      const cached = store.cache.get(effectiveKey);
      if (cached !== undefined) {
        result.set(key, cached);
        continue;
      }

      const inflightRequest = store.inflightRequests.get(effectiveKey);
      if (inflightRequest) {
        pending.push({ key, promise: inflightRequest });
        continue;
      }

      missingKeys.push(key);
    }

    if (missingKeys.length > 0) {
      const batchPromise = fetchMissing(missingKeys);

      for (const key of missingKeys) {
        const effectiveKey = this.resolveKey(key, opts?.cacheVariant);

        const perKeyPromise = batchPromise
          .then((fetched) => {
            const value = fetched.get(key);
            if (value !== null && value !== undefined) {
              store.cache.set(effectiveKey, value);
            }

            return value;
          })
          .finally(() => {
            store.inflightRequests.delete(effectiveKey);
          });

        store.inflightRequests.set(effectiveKey, perKeyPromise);
        pending.push({ key, promise: perKeyPromise });
      }
    }

    await Promise.all(
      pending.map(async ({ key, promise }) => {
        const value = await promise;
        if (value !== undefined) {
          result.set(key, value);
        }
      })
    );

    return result;
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
        inflightRequests: new Map<string, Promise<T | undefined>>(),
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
