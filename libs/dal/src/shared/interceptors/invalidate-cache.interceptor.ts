const USECASE_FUNCTION_NAME = 'execute';

// eslint-disable-next-line @typescript-eslint/naming-convention
export function InvalidateCache(storeKey?: string) {
  return (target: any, key: string, descriptor: any) => {
    const originalMethod = descriptor.value;
    const context = getKeyContext(key, target);

    descriptor.value = async function (...args: any[]) {
      const command = args[0];

      // if (command.invalidate !== true) return originalMethod.apply(this, args);

      const cacheKey = buildKey(context, command);

      if (!cacheKey) {
        return originalMethod.apply(args);
      }

      try {
        await this.cacheService.delByPattern(cacheKey);
      } catch (err) {
        // Logger.error(`An error has occurred when deleting "key: ${cacheKey}",`, 'InvalidateCache');
        return originalMethod.apply(this, args);
      }

      return originalMethod.apply(this, args);
    };
  };

  function getKeyContext(key: string, target: any) {
    const originCaller = key === USECASE_FUNCTION_NAME ? target.constructor.name : key;

    return storeKey ? storeKey : originCaller;
  }
}

function buildKey(prefix: string, keyConfig: Record<undefined, string>): string {
  let key = prefix;

  key = `${key}*`;

  return appendCredentials(key, keyConfig);
}

function appendCredentials(key: string, keyConfig: Record<undefined, string>) {
  let result = key;

  const credentials: Array<string> = ['id', 'subscriberId', 'organizationId', 'environmentId'];

  credentials.forEach((element) => {
    const credential = keyConfig[element];

    if (credential) {
      result += ':' + credential;
    }
  });

  return result;
}
