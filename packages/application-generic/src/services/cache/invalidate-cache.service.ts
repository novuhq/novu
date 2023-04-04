import { Injectable, Logger } from '@nestjs/common';

import { CacheService } from './cache.service';
import {
  buildKey,
  CacheInterceptorTypeEnum,
} from './interceptors/shared-cache';

@Injectable()
export class InvalidateCacheService {
  constructor(private cacheService: CacheService) {}

  public async clearCache({
    storeKeyPrefix,
    credentials,
  }: {
    storeKeyPrefix: CacheKeyPrefixEnum | CacheKeyPrefixEnum[];
    credentials:
      | { _id: string; _environmentId: string }
      | Record<string, unknown>;
  }) {
    Logger.log('Clearing the cache of keys with the specified prefixes');
    Logger.debug('StoreKeyPrefix(s) are: ' + storeKeyPrefix);
    Logger.debug('Credentials are: ' + (credentials._id as string));
    if (!this.cacheService?.cacheEnabled()) {
      Logger.verbose('Cashing service is not enabled to clear Cache.');

      return;
    }

    if (Array.isArray(storeKeyPrefix)) {
      Logger.verbose('Mapping all keys to flush');
      const invalidatePromises = storeKeyPrefix.map((prefix) => {
        return this.clearByPattern(prefix, credentials);
      });

      Logger.debug('invalidate promises are: ' + invalidatePromises);
      Logger.verbose('Removing all keys with prefix');
      await Promise.all(invalidatePromises);
    } else {
      Logger.warn('StoreKeyPrefix is not in array format');
      await this.clearByPattern(storeKeyPrefix, credentials);
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
      Logger.warn('Cachekey does not exist');

      return;
    }

    try {
      Logger.verbose('Awaiting cache delete by pattern');
      await this.cacheService.delByPattern(cacheKey);
      Logger.verbose('Finished cache delete by pattern');
    } catch (err) {
      Logger.error(
        `An error has occurred when deleting "key: ${cacheKey}",`,
        'InvalidateCache',
        err
      );
    }
  }
}

export enum CacheKeyPrefixEnum {
  MESSAGE_COUNT = 'message_count',
  FEED = 'feed',
  SUBSCRIBER = 'subscriber',
  NOTIFICATION_TEMPLATE = 'notification_template',
  USER = 'user',
  INTEGRATION = 'integration',
  ENVIRONMENT_BY_API_KEY = 'environment_by_api_key',
}
