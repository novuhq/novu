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
export function getIdentifier(key: string, keyConfig: Record<string, unknown>): [string, string] {
  const subscriberPreferredKeys = ['_subscriberId', 'subscriberId', '_id', 'id'];
  const idPreferredKeys = ['_id', 'id', '_subscriberId', 'subscriberId'];

  const subscriberPrefKey = subscriberPreferredKeys.find((prefKey) => keyConfig[prefKey]);
  const subscriberPreferred = [subscriberPrefKey, keyConfig[subscriberPrefKey] as string] as [string, string];

  const idPrefKey = idPreferredKeys.find((prefKey) => keyConfig[prefKey]);
  const idPreferred = [idPrefKey, keyConfig[idPrefKey] as string] as [string, string];

  return key.startsWith('Message') ? subscriberPreferred : idPreferred;
}

export function getEnvironment(keyConfig: Record<string, unknown>): [string, string] {
  return keyConfig._environmentId
    ? (['_environmentId', keyConfig._environmentId] as [string, string])
    : keyConfig.environmentId
    ? (['environmentId', keyConfig.environmentId] as [string, string])
    : [undefined, undefined];
}

export function buildCredentialsKeyPart(key: string, keyConfig: Record<string, unknown>): string {
  let credentialsResult = '';
  const identifier = getIdentifier(key, keyConfig);

  if (identifier[0]) {
    credentialsResult += ':' + getCredentialWithContext(identifier[0], identifier[1]);
  }

  const environment = getEnvironment(keyConfig);

  if (environment[0]) {
    credentialsResult += ':' + getCredentialWithContext(environment[0], environment[1]);
  }

  return credentialsResult;
}

export function getCredentialWithContext(credentialKey: string, credentialValue: string): string {
  const context = credentialKey.replace('_', '')[0];

  return context + '=' + credentialValue;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export enum CacheInterceptorTypeEnum {
  CACHED = 'cached',
  INVALIDATE = 'invalidate',
}

export function buildKey(
  prefix: string,
  methodName: string,
  keyConfig: Record<string, unknown>,
  interceptorType: CacheInterceptorTypeEnum
): string {
  let cacheKey = prefix;

  cacheKey = cacheKey + buildQueryKeyPart(methodName, interceptorType, keyConfig);

  const credentials = buildCredentialsKeyPart(cacheKey, keyConfig);

  return validateCredentials(prefix, credentials) ? cacheKey + credentials : '';
}

export function getQueryParams(methodName: string, keysConfig: unknown): string {
  let result =
    methodName === 'find' ? ':find' : methodName === 'findOne' || methodName === 'findById' ? ':findOne' : '';

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

export function getCredentialsKeys() {
  return ['id', 'subscriberId', 'environmentId', 'organizationId'].map((cred) => [cred, `_${cred}`]).flat();
}

/**
 * typeof args[0] === 'string' - is true only on cases where the method params are not object
 * that occurs only in method 'findById'
 * @param args
 */
export function buildCachedQuery(args: unknown[]): Record<string, unknown> {
  const fromStringArray = { id: args[0], environmentId: args[1] };
  const fromObjectArray = args.reduce((obj, item) => Object.assign(obj, item), {});

  return (typeof args[0] === 'string' ? fromStringArray : fromObjectArray) as Record<string, unknown>;
}

/**
 * on create request the _id is available after collection creation,
 * therefore we need to build it from the storage response
 * @param methodName
 * @param res
 * @param args
 */
export function getInvalidateQuery(
  methodName: string,
  res: Record<string, unknown>,
  args: Record<string, unknown>[]
): Record<string, unknown> {
  return methodName === 'create' ? res : args[0];
}

export function buildQueryKeyPart(
  methodName: string,
  interceptorType: CacheInterceptorTypeEnum,
  keyConfig: Record<string, unknown>
) {
  const WILD_CARD = '*';

  return interceptorType === CacheInterceptorTypeEnum.INVALIDATE ? WILD_CARD : getQueryParams(methodName, keyConfig);
}

export interface ICacheConfig {
  skipCache: boolean;
}
