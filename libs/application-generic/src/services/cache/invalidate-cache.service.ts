import { Inject, Injectable, Logger } from '@nestjs/common';
import { CacheService } from './cache.service';
import { buildKey, CacheInterceptorTypeEnum } from './interceptors/shared-cache';
import { CacheKeyPrefixEnum } from './key-builders';

const LOG_CONTEXT = 'InvalidateCache';

@Injectable()
export class InvalidateCacheService {
  constructor(@Inject(CacheService) private cacheService: CacheService) {}

  public async invalidateByKey({ key }: { key: string }): Promise<number> {
    if (!this.cacheService?.cacheEnabled()) return;

    try {
      return await this.cacheService.del(key);
    } catch (err) {
      Logger.error(err, `An error has occurred when deleting "key: ${key}",`, LOG_CONTEXT);
    }
  }

  public async invalidateQuery({ key }: { key: string }): Promise<void | unknown[]> {
    if (!this.cacheService?.cacheEnabled()) return;

    try {
      return await this.cacheService.delQuery(key);
    } catch (err) {
      Logger.error(err, `An error has occurred when deleting by query "key: ${key}",`, LOG_CONTEXT);
    }
  }

  private async clearByPattern(
    storeKeyPrefix: CacheKeyPrefixEnum,
    credentials: Record<string, unknown>
  ): Promise<unknown | undefined> {
    Logger.verbose(`Removing keys with prefix: ${storeKeyPrefix}`);
    Logger.debug(`storeKeyPrefix is: ${storeKeyPrefix}`);

    const cacheKey = buildKey(storeKeyPrefix, credentials, CacheInterceptorTypeEnum.INVALIDATE);

    if (!cacheKey) {
      Logger.warn('Cache key does not exist', LOG_CONTEXT);

      return;
    }

    try {
      Logger.verbose('Awaiting cache delete by pattern');
      const result = await this.cacheService.delByPattern(cacheKey);
      Logger.verbose('Finished cache delete by pattern');

      return result;
    } catch (err) {
      Logger.error(err, `An error has occurred when clearing by pattern "key: ${cacheKey}",`, LOG_CONTEXT);
    }
  }
}
