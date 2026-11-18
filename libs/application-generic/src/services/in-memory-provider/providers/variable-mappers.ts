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
const ENABLED_FLAG_VALUES = new Set(['true', '1', 'yes', 'on']);

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

/**
 * Env validator parse function for TLS flags. Accepts every value the providers
 * understand (empty, true/false, 1/0, yes/no, on/off in any case) and, so existing
 * deployments keep booting, any JSON the validators accepted before. Rejects the rest
 * so a typo such as `flase` fails at boot instead of silently turning TLS on.
 */
export const parseTlsFlagEnvValue = (input: string): string => {
  const normalized = normalizeFlag(input);

  if (!normalized || DISABLED_FLAG_VALUES.has(normalized) || ENABLED_FLAG_VALUES.has(normalized)) {
    return input;
  }

  try {
    JSON.parse(input);

    return input;
  } catch {
    throw new Error(`Expected a boolean flag (true/false, 1/0, yes/no, on/off), got "${input}"`);
  }
};
