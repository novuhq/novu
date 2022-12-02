function validateCredentials(keyToValidate: string) {
  const splitKeys = keyToValidate?.split(':');

  return splitKeys.length === 3;
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

  if (validateCredentials(credentialsResult)) {
    return key + credentialsResult;
  } else {
    return '';
  }
}
