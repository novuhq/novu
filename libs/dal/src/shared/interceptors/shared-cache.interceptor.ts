function validateCredentials(keyToValidate: string) {
  const splitKeys = keyToValidate?.split(':');

  return splitKeys.length === 3;
}

const STORE_CONNECTED = 'ready';

export function isStoreConnected(status: string | undefined) {
  return status === STORE_CONNECTED;
}

/**
 * Will append the identifier and environmentId, if failed to append one of them will return empty string
 * @param key
 * @param keyConfig
 */
export function appendCredentials(key: string, keyConfig: Record<string, undefined>) {
  let credentialsResult = '';

  const identifier = keyConfig._id ?? keyConfig.id ?? keyConfig._subscriberId ?? keyConfig.subscriberId;

  if (identifier) {
    credentialsResult += ':' + identifier;
  }

  const environment = keyConfig._environmentId ?? keyConfig.environmentId;

  if (environment) {
    credentialsResult += ':' + environment;
  }

  if (validateCredentials(credentialsResult)) {
    return key + credentialsResult;
  } else {
    return '';
  }
}
