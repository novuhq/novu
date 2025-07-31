import { CacheKeyPrefixEnum } from '../key-builders';

export function validateCredentials(keyPrefix: CacheKeyPrefixEnum, credentials: string) {
  const entitiesEnvironmentLevel = [
    CacheKeyPrefixEnum.USER,
    CacheKeyPrefixEnum.INTEGRATION,
    CacheKeyPrefixEnum.ENVIRONMENT_BY_API_KEY,
  ];
  const splitCredentials = credentials?.split(':').filter((possibleKey) => possibleKey?.length > 0);

  return entitiesEnvironmentLevel.some((cacheKey) => cacheKey === keyPrefix)
    ? splitCredentials.length === 1
    : splitCredentials.length === 2;
}

/**
 * The data related to the messages stored by the subscriberId
 * therefore in order to keep the stored data fresh we need to build the key with subscriberId first.
 * @param key
 * @param keyConfig
 */
export function getIdentifier(
  key: string,
  keyConfig: Record<string, unknown>
): { key: string | undefined; value: string } {
  const entitiesSubscriberPreferred = [CacheKeyPrefixEnum.MESSAGE_COUNT, CacheKeyPrefixEnum.FEED];
  const subscriberPreferredKeys = ['subscriberId', '_subscriberId', '_id', 'id'];
  const idPreferredKeys = ['_id', 'id', '_subscriberId', 'subscriberId'];

  const subscriberPrefKey = subscriberPreferredKeys.find((prefKey) => keyConfig[prefKey]);
  const subscriberPreferred = {
    key: subscriberPrefKey,
    value: keyConfig[subscriberPrefKey as string] as string,
  };

  const idPrefKey = idPreferredKeys.find((prefKey) => keyConfig[prefKey]);
  const idPreferred = {
    key: idPrefKey,
    value: keyConfig[idPrefKey as string] as string,
  };

  return entitiesSubscriberPreferred.some((entity) => key.startsWith(entity)) ? subscriberPreferred : idPreferred;
}

export function getEnvironment(keyConfig: Record<string, unknown>): { key: string; value: string } | undefined {
  return keyConfig._environmentId
    ? { key: '_environmentId', value: keyConfig._environmentId as string }
    : keyConfig.environmentId
      ? { key: 'environmentId', value: keyConfig.environmentId as string }
      : undefined;
}

export function buildCredentialsKeyPart(key: string, keyConfig: Record<string, unknown>): string {
  let credentialsResult = '';
  const identifier = getIdentifier(key, keyConfig);

  if (identifier?.key) {
    credentialsResult += `:${getCredentialWithContext(identifier.key, identifier.value)}`;
  }

  const environment = getEnvironment(keyConfig);

  if (environment?.key) {
    credentialsResult += `:${getCredentialWithContext(environment.key, environment.value)}`;
  }

  return credentialsResult;
}

export function getCredentialWithContext(credentialKey: string, credentialValue: string): string {
  const context = credentialKey.replace('_', '')[0];

  return `${context}=${credentialValue}`;
}

export enum CacheInterceptorTypeEnum {
  CACHED = 'cached',
  INVALIDATE = 'invalidate',
}

export function buildKey(
  prefix: CacheKeyPrefixEnum,
  keyConfig: Record<string, unknown>,
  interceptorType: CacheInterceptorTypeEnum
): string {
  let cacheKey = prefix as string;

  cacheKey += buildQueryKeyPart(prefix, interceptorType, keyConfig);

  const credentials = buildCredentialsKeyPart(cacheKey, keyConfig);

  return validateCredentials(prefix, credentials) ? cacheKey + credentials : '';
}

export function getQueryParams(keysConfig: Record<string, unknown>): string {
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

    const elementKey = `${key}=${elementValue as string}`;

    if (elementKey) {
      result += `:${elementKey}`;
    }
  }

  return result;
}

export function getCredentialsKeys() {
  return ['id', 'subscriberId', 'environmentId', 'organizationId'].flatMap((cred) => [cred, `_${cred}`]);
}

/**
 * typeof args[0] === 'string' - is true only on cases where the method params are not object
 * that occurs only in method 'findById'
 * @param args
 */
export function buildCachedQuery(args: unknown[]): Record<string, unknown> {
  const fromStringArray = { id: args[0], environmentId: args[1] };
  const fromObjectArray = args.reduce<Record<string, unknown>>((obj, item) => Object.assign(obj, item), {});

  return typeof args[0] === 'string' ? fromStringArray : fromObjectArray;
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
  return methodName.startsWith('Create') ? res : args[0];
}

export function buildQueryKeyPart(
  prefix: CacheKeyPrefixEnum,
  interceptorType: CacheInterceptorTypeEnum,
  keyConfig: Record<string, unknown>
) {
  const WILD_CARD = '*';

  return interceptorType === CacheInterceptorTypeEnum.INVALIDATE ? WILD_CARD : getQueryParams(keyConfig);
}
