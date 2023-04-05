import { Inject } from '@nestjs/common';

import {
  buildCachedQuery,
  buildKey,
  CacheInterceptorTypeEnum,
} from './shared-cache';
import { CacheService } from '../cache.service';
import { CacheKeyPrefixEnum } from '../key-builders';

// eslint-disable-next-line @typescript-eslint/naming-convention
function Cached(storeKeyPrefix: CacheKeyPrefixEnum) {
  const injectCache = Inject(CacheService);

  return (target: any, key: string, descriptor: any) => {
    const originalMethod = descriptor.value;
    const methodName = key;
    injectCache(target, 'cacheService');

    descriptor.value = async function (...args: any[]) {
      if (!this.cacheService?.cacheEnabled())
        return await originalMethod.apply(this, args);

      const query = buildCachedQuery(args);

      const cacheKey = buildKey(
        storeKeyPrefix,
        query,
        CacheInterceptorTypeEnum.CACHED
      );

      if (!cacheKey) {
        return await originalMethod.apply(this, args);
      }

      try {
        const value = await this.cacheService.get(cacheKey);
        if (value) {
          return JSON.parse(value);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(
          `An error has occurred when extracting "key: ${methodName}`,
          'CacheInterceptor',
          err
        );
      }

      const response = await originalMethod.apply(this, args);

      try {
        await this.cacheService.set(cacheKey, JSON.stringify(response));
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(
          `An error has occurred when inserting "key: ${methodName}", "value: ${response}"`,
          'CacheInterceptor',
          err
        );
      }

      return response;
    };
  };
}
