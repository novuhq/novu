import { Inject, Logger } from '@nestjs/common';

import { CacheService } from '../cache.service';

const LOG_CONTEXT = 'CachedQueryInterceptor';

// eslint-disable-next-line @typescript-eslint/naming-convention
export function CachedQuery({ builder }: { builder: (...args) => string }) {
  const injectCache = Inject(CacheService);

  return (target: any, key: string, descriptor: any) => {
    const originalMethod = descriptor.value;
    const methodName = key;
    injectCache(target, 'cacheService');

    descriptor.value = async function (...args: any[]) {
      if (!this.cacheService?.cacheEnabled())
        return await originalMethod.apply(this, args);

      const cacheService = this.cacheService as CacheService;

      const cacheKey = builder(...args);

      if (!cacheKey) {
        return await originalMethod.apply(this, args);
      }

      try {
        const value = await cacheService.get(cacheKey);
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
        await cacheService.setQuery(cacheKey, JSON.stringify(response));
      } catch (err) {
        Logger.error(
          err,
          `An error has occurred when inserting key: ${cacheKey} in method: ${methodName}`,
          LOG_CONTEXT
        );
      }

      return response;
    };
  };
}
