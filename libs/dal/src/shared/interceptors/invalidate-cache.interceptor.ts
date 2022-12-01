import { appendCredentials, isStoreConnected } from './shared-cache.interceptor';

// eslint-disable-next-line @typescript-eslint/naming-convention
export function InvalidateCache(storeKeyPrefix?: string) {
  return (target: any, key: string, descriptor: any) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      if (!isStoreConnected(this.cacheService?.getStatus())) return await originalMethod.apply(this, args);

      const query = args[0];

      const cacheKey = buildKey(storeKeyPrefix ?? this.MongooseModel?.modelName, query);

      if (!cacheKey) {
        return await originalMethod.apply(this, args);
      }

      try {
        this.cacheService.delByPattern(cacheKey);
      } catch (err) {
        // Logger.error(`An error has occurred when deleting "key: ${cacheKey}",`, 'InvalidateCache');
        return await originalMethod.apply(this, args);
      }

      return await originalMethod.apply(this, args);
    };
  };
}

function buildKey(prefix: string, keyConfig: Record<string, undefined>): string {
  let key = prefix;

  key = `${key}*`;

  return appendCredentials(key, keyConfig);
}
