import { getInvalidateQuery } from './shared-cache';
import { CacheKeyPrefixEnum, InvalidateCacheService } from '../services/cache';
import { Inject } from '@nestjs/common';

const USE_CASE_METHOD = 'execute';

// eslint-disable-next-line @typescript-eslint/naming-convention
export function InvalidateCache(storeKeyPrefix: CacheKeyPrefixEnum | CacheKeyPrefixEnum[]) {
  const injectCache = Inject(InvalidateCacheService);

  return (target: any, key: string, descriptor: any) => {
    const originalMethod = descriptor.value;
    const methodName = key === USE_CASE_METHOD ? target.constructor.name : key;
    injectCache(target, 'invalidateCache');

    descriptor.value = async function (...args: any[]) {
      const invalidateCache: InvalidateCacheService = this.invalidateCache;

      const res = await originalMethod.apply(this, args);

      if (!res) {
        return res;
      }

      const query = getInvalidateQuery(methodName, res, args);

      await invalidateCache.clearCache({
        storeKeyPrefix: getStoreKeyPrefix(storeKeyPrefix),
        credentials: query,
      });

      return res;
    };
  };
}

function getStoreKeyPrefix(storeKeyPrefix: CacheKeyPrefixEnum | CacheKeyPrefixEnum[]) {
  return typeof storeKeyPrefix === 'string' || storeKeyPrefix instanceof String ? storeKeyPrefix : [...storeKeyPrefix];
}
