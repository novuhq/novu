import { appendCredentials, isStoreConnected } from './shared-cache.interceptor';

// eslint-disable-next-line @typescript-eslint/naming-convention
export function Cached(storeKeyPrefix?: string) {
  return (target: any, key: string, descriptor: any) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      if (!isStoreConnected(this.cacheService?.getStatus())) return await originalMethod.apply(this, args);

      const query = args.reduce((obj, item) => Object.assign(obj, item), {});
      const cacheKey = buildKey(storeKeyPrefix ?? this.MongooseModel.modelName, query);

      if (!cacheKey) {
        return await originalMethod.apply(this, args);
      }

      try {
        const value = await this.cacheService.get(cacheKey);
        if (value) {
          return JSON.parse(value);
        }

        try {
          const response = await originalMethod.apply(this, args);

          await this.cacheService.set(cacheKey, JSON.stringify(response));

          return response;
        } catch (err) {
          // Logger.error(`An error has occured when inserting "key: ${key}", "value: ${response}"`, 'CacheInterceptor');
          return await originalMethod.apply(this, args);
        }
      } catch (e) {
        return await originalMethod.apply(this, args);
      }
    };
  };
}

function buildKey(prefix: string, keyConfig: Record<undefined, string>): string {
  let cacheKey = prefix;

  cacheKey = appendQueryParams(cacheKey, keyConfig);

  return appendCredentials(cacheKey, keyConfig);
}

function getCredentialsKeys() {
  return ['id', 'subscriberId', 'environmentId', 'organizationId'].map((cred) => [cred, `_${cred}`]).flat();
}

function appendQueryParams(cacheKey: string, keysConfig: any): string {
  let result = cacheKey;

  const keysToExclude = [...getCredentialsKeys()];

  const filteredContextKeys = Object.fromEntries(
    Object.entries(keysConfig).filter(([key, value]) => {
      return !keysToExclude.some((element) => element === key);
    })
  );

  for (const [key, value] of Object.entries(filteredContextKeys)) {
    if (value == null) continue;

    const elementValue = typeof value === 'object' ? JSON.stringify(value) : value;

    const elementKey = `${key}=${elementValue}`;

    if (elementKey) {
      result += ':' + elementKey;
    }
  }

  return result;
}
