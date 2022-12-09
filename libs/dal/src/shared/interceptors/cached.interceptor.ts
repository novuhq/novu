import { buildCachedQuery, buildKey, CacheInterceptorTypeEnum } from './shared-cache';

// eslint-disable-next-line @typescript-eslint/naming-convention
export function Cached(storeKeyPrefix?: string) {
  return (target: any, key: string, descriptor: any) => {
    const originalMethod = descriptor.value;
    const methodName = key;

    descriptor.value = async function (...args: any[]) {
      const skip = args[2]?.skipCache;
      if (!this.cacheService?.cacheEnabled() || skip) return await originalMethod.apply(this, args);

      const query = buildCachedQuery(args);

      const cacheKey = buildKey(
        storeKeyPrefix ?? this.MongooseModel.modelName,
        methodName,
        query,
        CacheInterceptorTypeEnum.CACHED
      );

      if (!cacheKey) {
        return await originalMethod.apply(this, args);
      }

      try {
        const value = await this.cacheService.get(cacheKey);
        if (value) {
          return JSON.parse(value);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`An error has occurred when extracting "key: ${key}`, 'CacheInterceptor', err);
      }

      const response = await originalMethod.apply(this, args);

      try {
        await this.cacheService.set(cacheKey, JSON.stringify(response));
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(
          `An error has occurred when inserting "key: ${key}", "value: ${response}"`,
          'CacheInterceptor',
          err
        );
      }

      return response;
    };
  };
}
