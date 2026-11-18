import { ConnectionOptions } from 'tls';

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

const normalizeFlag = (value: string | undefined): string | undefined =>
  convertStringValues(value)?.trim().toLowerCase() || undefined;

/**
 * TLS env vars are boolean-ish flags whose value is never read, so a truthiness
 * check would turn `REDIS_CLUSTER_TLS=false` into a TLS handshake against a
 * plaintext server. Anything but an explicit negative enables TLS.
 */
export const isTlsFlagEnabled = (value: string | undefined): boolean => {
  const normalized = normalizeFlag(value);

  if (!normalized) {
    return false;
  }

  return !DISABLED_FLAG_VALUES.has(normalized);
};

/**
 * The ElastiCache, MemoryDB and Azure cluster providers have always connected
 * over TLS when their flag is unset (ioredis treats `tls: {}` as enabled), and
 * deployments rely on that. Keep that default, add the servername when the flag
 * is on, and only turn TLS off on an explicit negative such as `false`.
 */
export const getDefaultOnTlsOptions = (
  value: string | undefined,
  servername: string | undefined
): ConnectionOptions | undefined => {
  const normalized = normalizeFlag(value);

  if (!normalized) {
    return {};
  }

  return DISABLED_FLAG_VALUES.has(normalized) ? undefined : { servername };
};
