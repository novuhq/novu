// eslint-disable-next-line @typescript-eslint/naming-convention
export function Cached(storeKeyPrefix?: string) {
  return (target: any, key: string, descriptor: any) => {
    const STORE_CONNECTED = 'ready';
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      if (this.cacheService?.status !== STORE_CONNECTED) return await originalMethod.apply(this, args);

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

function appendCredentials(cacheKey: string, keyConfig: Record<undefined, string>) {
  let result = cacheKey;

  const credentials: Array<string> = ['id', 'subscriberId', 'environmentId'];

  credentials.forEach((element) => {
    const credential = keyConfig['_' + element] ?? keyConfig[element];

    if (credential) {
      result += ':' + credential;
    }
  });

  return result;
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
    if (value == null) return;

    const elementValue = typeof value === 'object' ? JSON.stringify(value) : value;

    const elementKey = `${key}=${elementValue}`;

    if (elementKey) {
      result += ':' + elementKey;
    }
  }

  return result;
}
