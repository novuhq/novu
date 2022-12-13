import { getInvalidateQuery } from './shared-cache';
import { CacheKeyPrefixEnum, CacheService, invalidateCache } from '../services/cache';
import { Inject } from '@nestjs/common';

const USE_CASE_METHOD = 'execute';

// eslint-disable-next-line @typescript-eslint/naming-convention
export function InvalidateCache(storeKeyPrefix: CacheKeyPrefixEnum | CacheKeyPrefixEnum[]) {
  const injectCache = Inject(CacheService);

  return (target: any, key: string, descriptor: any) => {
    const originalMethod = descriptor.value;
    const methodName = key === USE_CASE_METHOD ? target.constructor.name : key;
    injectCache(target, 'cacheService');

    descriptor.value = async function (...args: any[]) {
      if (!this.cacheService?.cacheEnabled()) return await originalMethod.apply(this, args);

      const res = await originalMethod.apply(this, args);

      if (!res) {
        return res;
      }

      const query = getInvalidateQuery(methodName, res, args);

      invalidateCache({
        service: this.cacheService,
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
