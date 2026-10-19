import { Inject } from '@nestjs/common';
import { CacheService, CachingConfig } from '../cache.service';

type CachedEntityOptions<T_Output, T_Args extends any[]> = CachingConfig & {
  skipCache?: (...args: T_Args) => boolean;
  skipSaveToCache?: (response: T_Output) => boolean;
};

export function CachedResponse<T_Output = any, T_Args extends any[] = any[]>({
  builder,
  options,
}: {
  builder: (...args: T_Args) => string;
  options?: CachedEntityOptions<T_Output, T_Args>;
}) {
  const injectCache = Inject(CacheService);

  return (target: any, key: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value as (...args: T_Args) => Promise<T_Output>;
    const methodName = key;
    injectCache(target, 'cacheService');

    descriptor.value = async function (this: any, ...args: T_Args): Promise<T_Output> {
      const cacheService = this.cacheService as CacheService;

      // Check if cache is disabled
      if (!cacheService?.cacheEnabled()) {
        return await originalMethod.apply(this, args);
      }

      // Check if we should skip caching based on input arguments
      if (options?.skipCache && options.skipCache(...args)) {
        return await originalMethod.apply(this, args);
      }

      const cacheKey = builder(...args);
      if (!cacheKey) {
        return await originalMethod.apply(this, args);
      }

      try {
        const value = await cacheService.get(cacheKey);

        if (value) {
          const parsedValue = parseValueFromCache(value);

          return parsedValue as T_Output;
        }
      } catch (err) {
        // Silently handle cache retrieval error
      }

      const response: T_Output = await originalMethod.apply(this, args);

      try {
        if (!options?.skipSaveToCache?.(response)) {
          const valueToCache = isPrimitive(response) ? String(response) : JSON.stringify(response);
          await cacheService.set(cacheKey, valueToCache, options);
        }

        return response;
      } catch {
        // Silently handle cache insertion error
        return response;
      }
    };

    return descriptor;
  };
}

function parseValueFromCache(value: string): unknown {
  if (value === 'null') return null;
  if (value === 'true') return true;
  if (value === 'false') return false;

  const numValue = Number(value);
  if (!Number.isNaN(numValue)) return numValue;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function isPrimitive(value: unknown): boolean {
  return value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}
