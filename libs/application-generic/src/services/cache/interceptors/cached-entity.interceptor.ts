import { Inject, Logger } from '@nestjs/common';
import { DistributedLockService } from '../../distributed-lock';
import { CacheService, CachingConfig } from '../cache.service';

type CacheLockOptions = {
  /**
   * Whether to enable locking when the resource is not found in the cache.
   * When set to true, the cache will be locked for the specified TTL and retry count.
   *
   * @default false
   */
  enableLock: boolean;
  /**
   * The time to live (TTL) for the cache lock. Defaults to the distributed lock service's default TTL.
   */
  ttl: number;
  /**
   * The number of retries to attempt when acquiring the cache lock. Defaults to the distributed lock service's default retry count.
   */
  retryCount: number;
};

const LOG_CONTEXT = 'CachedEntityInterceptor';
// eslint-disable-next-line @typescript-eslint/naming-convention
export function CachedEntity({
  builder,
  options,
  lockOptions,
}: {
  builder: (...args) => string;
  options?: CachingConfig;
  lockOptions?: CacheLockOptions;
}) {
  const injectCache = Inject(CacheService);
  const injectLock = lockOptions?.enableLock
    ? Inject(DistributedLockService)
    : undefined;

  return (target: any, key: string, descriptor: any) => {
    const originalMethod = descriptor.value;
    const methodName = key;
    injectCache(target, 'cacheService');
    if (lockOptions?.enableLock) {
      injectLock(target, 'lockService');
    }

    descriptor.value = async function (...args: any[]) {
      if (!this.cacheService?.cacheEnabled()) {
        return await originalMethod.apply(this, args);
      }

      const cacheService = this.cacheService as CacheService;
      const lockService = this.lockService as DistributedLockService;

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

      let unlock = null;
      if (lockOptions?.enableLock) {
        try {
          const lockCacheKey = `lock:${cacheKey}`;
          unlock = await lockService.lock(lockCacheKey, lockOptions.ttl, {
            retryCount: lockOptions.retryCount,
          });
        } catch (err) {
          Logger.error(
            err,
            `Failed to acquire lock for key: ${cacheKey} in "method: ${methodName}"`,
            LOG_CONTEXT
          );
          throw new Error(`Failed to acquire lock for key: ${cacheKey}`);
        }
      }

      let response: unknown;
      try {
        response = await originalMethod.apply(this, args);
      } catch (error) {
        if (unlock) {
          await unlock();
        }

        throw error;
      }

      try {
        await cacheService.set(cacheKey, JSON.stringify(response), options);

        return response;
      } catch (err) {
        Logger.error(
          err,
          `An error has occurred when inserting key: ${cacheKey} in "method: ${methodName}`,
          LOG_CONTEXT
        );
      } finally {
        if (unlock) {
          await unlock();
        }
      }
    };
  };
}
