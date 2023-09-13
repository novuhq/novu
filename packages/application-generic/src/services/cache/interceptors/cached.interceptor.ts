import { Inject, Logger } from '@nestjs/common';

import {
  buildCachedQuery,
  buildKey,
  CacheInterceptorTypeEnum,
} from './shared-cache';
import { CacheService } from '../cache.service';
import { CacheKeyPrefixEnum } from '../key-builders';

const LOG_CONTEXT = 'CachedInterceptor';

// eslint-disable-next-line @typescript-eslint/naming-convention
export function Cached(storeKeyPrefix: CacheKeyPrefixEnum) {
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
        Logger.error(
          err,
          `An error has occurred when extracting "key: ${cacheKey}" in "method: ${methodName}"`,
          LOG_CONTEXT
        );
      }

      const response = await originalMethod.apply(this, args);

      try {
        await this.cacheService.set(cacheKey, JSON.stringify(response));
      } catch (err) {
        Logger.error(
          err,
          `An error has occurred when inserting key: ${cacheKey} in "method: ${methodName}`,
          LOG_CONTEXT
        );
      }

      return response;
    };
  };
}
