import { appendCredentials } from './shared-cache.interceptor';

// eslint-disable-next-line @typescript-eslint/naming-convention
export function InvalidateCache(storeKeyPrefix?: string) {
  return (target: any, key: string, descriptor: any) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      if (!this.cacheService?.cacheEnabled()) return await originalMethod.apply(this, args);

      const res = await originalMethod.apply(this, args);

      if (!res) {
        return res;
      }

      const query = getQuery(key, res, args);

      const cacheKey = buildKey(storeKeyPrefix ?? this.MongooseModel?.modelName, query);

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

function buildKey(prefix: string, keyConfig: Record<string, undefined>): string {
  let key = prefix;

  key = `${key}*`;

  return appendCredentials(key, keyConfig);
}

/**
 * on create request the _id is available after collection creation,
 * therefore we need to build it from the storage response
 * @param key
 * @param res
 * @param args
 */
function getQuery(key: string, res, args: any[]) {
  return key === 'create' ? res : args[0];
}
