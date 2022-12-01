function validateCredentials(key: string, keyToValidate: string) {
  const splitKeys = keyToValidate?.split(':').filter((possibleKey) => possibleKey?.length > 0);

  return key.startsWith('User') ? splitKeys.length === 1 : splitKeys.length === 2;
}

const STORE_CONNECTED = 'ready';

export function isStoreConnected(status: string | undefined) {
  return status === STORE_CONNECTED;
}

/**
 * The data related to the messages stored by the subscriberId
 * therefore in order to keep the stored data fresh we need to build the key with subscriberId first.
 * @param key
 * @param keyConfig
 */
function getIdentifier(key: string, keyConfig: Record<string, undefined>) {
  return key.startsWith('Message')
    ? keyConfig._subscriberId ?? keyConfig.subscriberId ?? keyConfig._id ?? keyConfig.id
    : keyConfig._id ?? keyConfig.id ?? keyConfig._subscriberId ?? keyConfig.subscriberId;
}

/**
 * Will append the identifier and environmentId, if failed to append one of them will return empty string
 * @param key
 * @param keyConfig
 */
export function appendCredentials(key: string, keyConfig: Record<string, undefined>) {
  let credentialsResult = '';
  const identifier = getIdentifier(key, keyConfig);

  if (identifier) {
    credentialsResult += ':' + identifier;
  }

  const environment = keyConfig._environmentId ?? keyConfig.environmentId;

  if (environment) {
    credentialsResult += ':' + environment;
  }

  if (validateCredentials(key, credentialsResult)) {
    return key + credentialsResult;
  } else {
    return '';
  }
}
