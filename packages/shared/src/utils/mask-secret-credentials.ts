import { ChatProviderIdEnum, CredentialsKeyEnum } from '../types';

/** A fixed run, so a masked value doesn't give away how long the secret is. */
export const MASKED_SECRET_FILL = '•'.repeat(16);

const VISIBLE_PREFIX_LENGTH = 3;
const VISIBLE_SUFFIX_LENGTH = 4;
/** From this length the first and last characters show; the 7 visible ones are then a minority of the value. */
const MIN_LENGTH_FOR_PREFIX_AND_SUFFIX = 12;
/** Shorter secrets show their last characters only, down to this length; below it those would be most of the value. */
const MIN_LENGTH_FOR_SUFFIX = 8;

/**
 * Integration credentials the API returns masked. `headers` is encrypted at rest too, but it is an editable
 * key/value setting rather than a single secret, so it is returned as stored.
 */
export const MASKED_CREDENTIAL_KEYS: readonly string[] = [
  CredentialsKeyEnum.ApiKey,
  CredentialsKeyEnum.ApiToken,
  CredentialsKeyEnum.SecretKey,
  CredentialsKeyEnum.Token,
  CredentialsKeyEnum.Password,
  CredentialsKeyEnum.ServiceAccount,
  CredentialsKeyEnum.SigningSecret,
];

/** `sk_live_abc123def456` becomes `sk_••••••••••••••••f456`; a short `hunter2024` becomes `••••••••••••••••2024`. */
export function maskSecret(value: string): string {
  // Multi-line and JSON secrets (a service account file) have no meaningful first or last characters.
  const isSingleToken = !/\s/.test(value) && !value.startsWith('{');
  if (!isSingleToken || value.length < MIN_LENGTH_FOR_SUFFIX) {
    return MASKED_SECRET_FILL;
  }

  const suffix = value.slice(-VISIBLE_SUFFIX_LENGTH);
  if (value.length < MIN_LENGTH_FOR_PREFIX_AND_SUFFIX) {
    return `${MASKED_SECRET_FILL}${suffix}`;
  }

  return `${value.slice(0, VISIBLE_PREFIX_LENGTH)}${MASKED_SECRET_FILL}${suffix}`;
}

/** Integration settings (`configurations`) that are secrets: the key a provider signs its delivery webhooks with. */
export const MASKED_CONFIGURATION_KEYS: readonly string[] = ['inboundWebhookSigningKey'];

export function isMaskedSecret(value: unknown): value is string {
  return typeof value === 'string' && value.includes(MASKED_SECRET_FILL);
}

function isMaskedCredential(providerId: string, key: string, value: unknown): value is string {
  if (!MASKED_CREDENTIAL_KEYS.includes(key) || typeof value !== 'string' || value === '') {
    return false;
  }

  // WhatsApp's `token` is the webhook verify token Novu generates; the user copies it into Meta's dashboard.
  return !(providerId === ChatProviderIdEnum.WhatsAppBusiness && key === CredentialsKeyEnum.Token);
}

type IsSecret = (key: string, value: unknown) => value is string;

function isSecretConfiguration(key: string, value: unknown): value is string {
  return MASKED_CONFIGURATION_KEYS.includes(key) && typeof value === 'string' && value !== '';
}

function maskValues<T extends object>(values: T, isSecret: IsSecret): T {
  const masked: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(values ?? {})) {
    masked[key] = isSecret(key, value) ? maskSecret(value) : value;
  }

  return masked as T;
}

function restoreValues<T extends object>(
  values: T,
  storedValues: object | undefined,
  isSecret: IsSecret
): { values: T; unresolvedKeys: string[] } {
  const stored: Record<string, unknown> = { ...storedValues };
  const restored: Record<string, unknown> = {};
  const unresolvedKeys: string[] = [];

  for (const [key, value] of Object.entries(values ?? {})) {
    restored[key] = value;

    if (!isSecret(key, value) || !isMaskedSecret(value)) {
      continue;
    }

    const storedValue = stored[key];
    if (typeof storedValue === 'string' && maskSecret(storedValue) === value) {
      restored[key] = storedValue;
    } else {
      unresolvedKeys.push(key);
    }
  }

  return { values: restored as T, unresolvedKeys };
}

/** The credentials as a client may see them: every stored secret replaced by its mask. */
export function maskSecretCredentials<T extends object>(providerId: string, credentials: T): T {
  return maskValues(credentials, (key, value): value is string => isMaskedCredential(providerId, key, value));
}

/** The settings as a client may see them: the webhook signing key replaced by its mask. */
export function maskSecretConfigurations<T extends object>(configurations: T): T {
  return maskValues(configurations, isSecretConfiguration);
}

/**
 * Puts the stored secrets back where a client sent their masks, which is how it says "unchanged".
 * A mask that matches no stored secret can't be saved; its key is reported in `unresolvedKeys`.
 */
export function restoreMaskedCredentials<T extends object>(
  providerId: string,
  credentials: T,
  storedCredentials: object | undefined
): { credentials: T; unresolvedKeys: string[] } {
  const { values, unresolvedKeys } = restoreValues(credentials, storedCredentials, (key, value): value is string =>
    isMaskedCredential(providerId, key, value)
  );

  return { credentials: values, unresolvedKeys };
}

/** The same for settings: the stored webhook signing key goes back where its mask was sent. */
export function restoreMaskedConfigurations<T extends object>(
  configurations: T,
  storedConfigurations: object | undefined
): { configurations: T; unresolvedKeys: string[] } {
  const { values, unresolvedKeys } = restoreValues(configurations, storedConfigurations, isSecretConfiguration);

  return { configurations: values, unresolvedKeys };
}
