import { Inject } from '@nestjs/common';

import { CacheService } from '../cache.service';

// eslint-disable-next-line @typescript-eslint/naming-convention
export function CachedEntity({ builder }: { builder: (...args) => string }) {
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
        // eslint-disable-next-line no-console
        console.error(
          `An error has occurred when extracting "key: ${methodName}`,
          'CacheInterceptor',
          err
        );
      }

      const response = await originalMethod.apply(this, args);

      try {
        await cacheService.set(cacheKey, JSON.stringify(response));
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
