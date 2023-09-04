import { Inject, Logger } from '@nestjs/common';

import { CacheService, CachingConfig } from '../cache.service';

const LOG_CONTEXT = 'CachedEntityInterceptor';
// eslint-disable-next-line @typescript-eslint/naming-convention
export function CachedEntity({
  builder,
  options,
}: {
  builder: (...args) => string;
  options?: CachingConfig;
}) {
  const injectCache = Inject(CacheService);

  return (target: any, key: string, descriptor: any) => {
    const originalMethod = descriptor.value;
    const methodName = key;
    injectCache(target, 'cacheService');

    descriptor.value = async function (...args: any[]) {
      if (!this.cacheService?.cacheEnabled()) {
        return await originalMethod.apply(this, args);
      }

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
        await cacheService.set(cacheKey, JSON.stringify(response), options);
      } catch (err) {
        // eslint-disable-next-line no-console
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
