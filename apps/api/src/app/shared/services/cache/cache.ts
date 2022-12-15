import { ICacheService } from './cache.service';
import { buildKey, CacheInterceptorTypeEnum } from '../../interceptors';

export function invalidateCache({
  service,
  storeKeyPrefix,
  credentials,
}: {
  service: ICacheService;
  storeKeyPrefix: CacheKeyPrefixEnum | CacheKeyPrefixEnum[];
  credentials: Record<string, unknown>;
}) {
  if (typeof storeKeyPrefix === 'string' || storeKeyPrefix instanceof String) {
    invalidateCase(storeKeyPrefix as string, credentials, service);
  } else {
    storeKeyPrefix.forEach((prefix) => invalidateCase(prefix, credentials, service));
  }
}

function invalidateCase(storeKeyPrefix: string, credentials: Record<string, unknown>, service) {
  const cacheKey = buildKey(storeKeyPrefix, '', credentials, CacheInterceptorTypeEnum.INVALIDATE);

  if (!cacheKey) {
    return;
  }

  try {
    service.delByPattern(cacheKey);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`An error has occurred when deleting "key: ${cacheKey}",`, 'InvalidateCache', err);
  }
}

export enum CacheKeyPrefixEnum {
  MESSAGE_COUNT = 'message_count',
  FEED = 'feed',
  SUBSCRIBER = 'subscriber',
  NOTIFICATION_TEMPLATE = 'notification_template',
}
