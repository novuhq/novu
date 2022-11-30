import { appendCredentials, isStoreConnected } from './shared-cache.interceptor';

// eslint-disable-next-line @typescript-eslint/naming-convention
export function InvalidateCache(storeKeyPrefix?: string) {
  return (target: any, key: string, descriptor: any) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      if (!isStoreConnected(this.cacheService?.getStatus())) return await originalMethod.apply(this, args);

      const res = await originalMethod.apply(this, args);

      if (!res) {
        return res;
      }

      const query = key === 'create' ? res : args[0];

      const cacheKey = buildKey(storeKeyPrefix ?? this.MongooseModel?.modelName, query);

      if (!cacheKey) {
        return res;
      }

      try {
        this.cacheService.delByPattern(cacheKey);

        return res;
      } catch (err) {
        // Logger.error(`An error has occurred when deleting "key: ${cacheKey}",`, 'InvalidateCache');
        return res;
      }
    };
  };
}

function buildKey(prefix: string, keyConfig: Record<string, undefined>): string {
  let key = prefix;

  key = `${key}*`;

  return appendCredentials(key, keyConfig);
}
