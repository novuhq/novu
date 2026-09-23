/**
 * Due some problems with Azure Redis DB that doesn't allow for certain
 * configuration values to be empty or have an empty string and as we don't
 * want to process them in our provider configuration files, we implement
 * this mapper function to be able to overcome that limitation in Azure
 * temporarily while we find a better solution
 */
export const convertStringValues = (value: string | undefined): string | undefined => {
  if (!value || value === 'undefined' || value === 'null') {
    return undefined;
  }

  return value;
};

const DISABLED_FLAG_VALUES = new Set(['false', '0', 'no', 'off']);

/**
 * TLS env vars are boolean-ish flags whose value is never read, so a truthiness
 * check would turn `REDIS_CLUSTER_TLS=false` into a TLS handshake against a
 * plaintext server. Anything but an explicit negative enables TLS.
 */
export const isTlsFlagEnabled = (value: string | undefined): boolean => {
  const normalized = convertStringValues(value)?.trim().toLowerCase();

  if (!normalized) {
    return false;
  }

  return !DISABLED_FLAG_VALUES.has(normalized);
};
