import { Injectable, Logger } from '@nestjs/common';

import { CacheKeyPrefixEnum } from './key-builders';
import { CacheService } from './cache.service';
import {
  buildKey,
  CacheInterceptorTypeEnum,
} from './interceptors/shared-cache';

const LOG_CONTEXT = 'InvalidateCache';

@Injectable()
export class InvalidateCacheService {
  constructor(private cacheService: CacheService) {}

  public async invalidateByKey({ key }: { key: string }) {
    if (!this.cacheService?.cacheEnabled()) return;

    try {
      await this.cacheService.del(key);
    } catch (err) {
      Logger.error(
        err,
        `An error has occurred when deleting "key: ${key}",`,
        LOG_CONTEXT
      );
    }
  }

  public async invalidateQuery({ key }: { key: string }) {
    if (!this.cacheService?.cacheEnabled()) return;

    try {
      await this.cacheService.delQuery(key);
    } catch (err) {
      Logger.error(
        err,
        `An error has occurred when deleting "key: ${key}",`,
        LOG_CONTEXT
      );
    }
  }

  private async clearByPattern(
    storeKeyPrefix: CacheKeyPrefixEnum,
    credentials: Record<string, unknown>
  ) {
    Logger.verbose('Removing keys with prefix: ' + storeKeyPrefix);
    Logger.debug('storeKeyPrefix is: ' + storeKeyPrefix);

    const cacheKey = buildKey(
      storeKeyPrefix,
      credentials,
      CacheInterceptorTypeEnum.INVALIDATE
    );

    if (!cacheKey) {
      Logger.warn('Cachekey does not exist', LOG_CONTEXT);

      return;
    }

    try {
      Logger.verbose('Awaiting cache delete by pattern');
      await this.cacheService.delByPattern(cacheKey);
      Logger.verbose('Finished cache delete by pattern');
    } catch (err) {
      Logger.error(
        err,
        `An error has occurred when deleting "key: ${cacheKey}",`,
        LOG_CONTEXT
      );
    }
  }
}
