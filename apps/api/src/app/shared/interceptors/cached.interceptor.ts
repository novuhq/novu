import { CacheService } from '../services/cache/cache.service';

const cacheService = new CacheService();
const USECASE_FUNCTION_NAME = 'execute';

// eslint-disable-next-line @typescript-eslint/naming-convention
export function Cached(storeKey?: string) {
  return (target: any, key: string, descriptor: any) => {
    const originalMethod = descriptor.value;
    const context = getKeyContext(key, target);

    descriptor.value = async function (...args: any[]) {
      const command = args[0];

      const cacheKey = buildKey(context, command);

      if (!cacheKey) {
        return originalMethod.apply(args);
      }

      try {
        const value = await cacheService.get(cacheKey);
        if (value) {
          return JSON.parse(value);
        }

        try {
          const response = await originalMethod.apply(this, args);
          await cacheService.set(cacheKey, JSON.stringify(response));

          return response;
        } catch (err) {
          // Logger.error(`An error has occured when inserting "key: ${key}", "value: ${response}"`, 'CacheInterceptor');
          return originalMethod.apply(this, args);
        }
      } catch (e) {
        return originalMethod.apply(this, args);
      }
    };
  };

  function getKeyContext(key: string, target: any) {
    const originCaller = key === USECASE_FUNCTION_NAME ? target.constructor.name : key;

    return storeKey ? storeKey : originCaller;
  }
}

function buildKey(prefix: string, keyConfig: Record<undefined, string>): string {
  let key = prefix;

  key = appendQueryParams(key, keyConfig);

  return appendCredentials(key, keyConfig);
}

function appendCredentials(key: string, keyConfig: Record<undefined, string>) {
  let result = key;

  const credentials: Array<string> = ['id', 'organizationId', 'environmentId'];

  credentials.forEach((element) => {
    const credential = keyConfig[element] || keyConfig[`_${element}`];

    if (credential) {
      result += ':' + credential;
    }
  });

  return result;
}

function appendQueryParams(key: string, keyConfig: any): string {
  let queryParamsKey = key;
  const keyElements: Array<string> = ['feedId', 'seen', 'read', 'page', 'query'];

  keyElements.forEach((element) => {
    if (keyConfig[element] == null) return;

    const elementValue =
      typeof keyConfig[element] === 'object' ? JSON.stringify(keyConfig[element]) : keyConfig[element];

    const elementKey = `${element}=${elementValue}`;

    if (elementKey) {
      queryParamsKey += ':' + elementKey;
    }
  });

  return queryParamsKey;
}
