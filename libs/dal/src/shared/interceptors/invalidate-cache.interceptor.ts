import { buildKey, CacheInterceptorTypeEnum, getInvalidateQuery } from './shared-cache';

// eslint-disable-next-line @typescript-eslint/naming-convention
export function InvalidateCache(storeKeyPrefix?: string) {
  return (target: any, key: string, descriptor: any) => {
    const originalMethod = descriptor.value;
    const methodName = key;

    descriptor.value = async function (...args: any[]) {
      if (!this.cacheService?.cacheEnabled()) return await originalMethod.apply(this, args);

      const res = await originalMethod.apply(this, args);

      if (!res) {
        return res;
      }

      const query = getInvalidateQuery(key, res, args);

      const cacheKey = buildKey(
        storeKeyPrefix ?? this.MongooseModel?.modelName,
        methodName,
        query,
        CacheInterceptorTypeEnum.INVALIDATE
      );

      if (!cacheKey) {
        return res;
      }

      try {
        this.cacheService.delByPattern(cacheKey);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`An error has occurred when deleting "key: ${cacheKey}",`, 'InvalidateCache', err);
      }

      return res;
    };
  };
}
