// eslint-disable-next-line @typescript-eslint/naming-convention
export function InvalidateCache(storeKeyPrefix?: string) {
  return (target: any, key: string, descriptor: any) => {
    const originalMethod = descriptor.value;
    const STORE_CONNECTED = 'ready';

    descriptor.value = async function (...args: any[]) {
      if (this.cacheService?.status !== STORE_CONNECTED) return await originalMethod.apply(this, args);

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

function buildKey(prefix: string, keyConfig: Record<undefined, string>): string {
  let key = prefix;

  key = `${key}*`;

  return appendCredentials(key, keyConfig);
}

function appendCredentials(key: string, keyConfig: Record<undefined, string>) {
  let result = key;

  const credentials: Array<string> = ['id', 'subscriberId', 'environmentId'];

  credentials.forEach((element) => {
    const credential = keyConfig['_' + element] ?? keyConfig[element];

    if (credential) {
      result += ':' + credential;
    }
  });

  return result;
}
