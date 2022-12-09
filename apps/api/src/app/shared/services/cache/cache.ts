import { buildKey, CacheInterceptorTypeEnum, ICacheService } from '@novu/dal';

export function invalidateCache({
  service,
  storeKeyPrefix,
  credentials,
}: {
  service: ICacheService;
  storeKeyPrefix: string | string[];
  credentials: { subscriberId: string; environmentId: string };
}) {
  if (typeof storeKeyPrefix === 'string' || storeKeyPrefix instanceof String) {
    invalidateCase(storeKeyPrefix as string, credentials, service);
  } else {
    storeKeyPrefix.forEach((prefix) => invalidateCase(prefix, credentials, service));
  }
}

function invalidateCase(storeKeyPrefix: string, credentials: { subscriberId: string; environmentId: string }, service) {
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
