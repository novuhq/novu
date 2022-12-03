export function validateCredentials(keyPrefix: string, credentials: string) {
  const splitCredentials = credentials?.split(':').filter((possibleKey) => possibleKey?.length > 0);

  return keyPrefix.startsWith('User') ? splitCredentials.length === 1 : splitCredentials.length === 2;
}

/**
 * The data related to the messages stored by the subscriberId
 * therefore in order to keep the stored data fresh we need to build the key with subscriberId first.
 * @param key
 * @param keyConfig
 */
function getIdentifier(key: string, keyConfig: Record<string, undefined>) {
  const subscriberPreferred = keyConfig._subscriberId ?? keyConfig.subscriberId ?? keyConfig._id ?? keyConfig.id;
  const idPreferred = keyConfig._id ?? keyConfig.id ?? keyConfig._subscriberId ?? keyConfig.subscriberId;

  return key.startsWith('Message') ? subscriberPreferred : idPreferred;
}

export function buildCredentialsKeyPart(key: string, keyConfig: Record<string, undefined>) {
  let credentialsResult = '';
  const identifier = getIdentifier(key, keyConfig);

  if (identifier) {
    credentialsResult += ':' + identifier;
  }

  const environment = keyConfig._environmentId ?? keyConfig.environmentId;

  if (environment) {
    credentialsResult += ':' + environment;
  }

  return credentialsResult;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export enum CacheInterceptorTypeEnum {
  CACHED = 'cached',
  INVALIDATE = 'invalidate',
}

export function buildKey(
  prefix: string,
  keyConfig: Record<undefined, string>,
  interceptorType: CacheInterceptorTypeEnum
): string {
  let cacheKey = prefix;

  cacheKey = cacheKey + buildQueryKeyPart(cacheKey, interceptorType, keyConfig);

  const credentials = buildCredentialsKeyPart(cacheKey, keyConfig);

  return validateCredentials(prefix, credentials) ? cacheKey + credentials : '';
}

function getQueryParams(keysConfig: any): string {
  let result = '';

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

function getCredentialsKeys() {
  return ['id', 'subscriberId', 'environmentId', 'organizationId'].map((cred) => [cred, `_${cred}`]).flat();
}

/**
 * typeof args[0] === 'string' - is true only on cases where the method params are not object
 * that occurs only in method 'findById'
 * @param args
 */
export function buildCachedQuery(args: any[]) {
  return typeof args[0] === 'string'
    ? { id: args[0], environmentId: args[1] }
    : args.reduce((obj, item) => Object.assign(obj, item), {});
}

/**
 * on create request the _id is available after collection creation,
 * therefore we need to build it from the storage response
 * @param key
 * @param res
 * @param args
 */
export function getInvalidateQuery(key: string, res, args: any[]) {
  return key === 'create' ? res : args[0];
}

function buildQueryKeyPart(cacheKey: string, interceptorType: CacheInterceptorTypeEnum, keyConfig: any) {
  const WILD_CARD = '*';

  return interceptorType === CacheInterceptorTypeEnum.INVALIDATE ? WILD_CARD : getQueryParams(keyConfig);
}
