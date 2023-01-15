import { CacheService } from './cache.service';
import { buildKey, CacheInterceptorTypeEnum } from '../../interceptors';
import { Injectable } from '@nestjs/common';

@Injectable()
export class InvalidateCacheService {
  constructor(private cacheService: CacheService) {}

  public async clearCache({
    storeKeyPrefix,
    credentials,
  }: {
    storeKeyPrefix: CacheKeyPrefixEnum | CacheKeyPrefixEnum[];
    credentials: { _id: string; _environmentId: string } | Record<string, unknown>;
  }) {
    if (!this.cacheService?.cacheEnabled()) return;

    if (Array.isArray(storeKeyPrefix)) {
      const invalidatePromises = storeKeyPrefix.map((prefix) => {
        return this.clearByPattern(prefix, credentials);
      });

      await Promise.all(invalidatePromises);
    } else {
      await this.clearByPattern(storeKeyPrefix, credentials);
    }
  }

  private async clearByPattern(storeKeyPrefix: CacheKeyPrefixEnum, credentials: Record<string, unknown>) {
    const cacheKey = buildKey(storeKeyPrefix, credentials, CacheInterceptorTypeEnum.INVALIDATE);

    if (!cacheKey) {
      return;
    }

    try {
      await this.cacheService.delByPattern(cacheKey);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`An error has occurred when deleting "key: ${cacheKey}",`, 'InvalidateCache', err);
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
