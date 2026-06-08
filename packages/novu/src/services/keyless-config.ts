import { createHash } from 'node:crypto';

const KEYLESS_CONFIG_KEY_PREFIX = 'connectKeylessApplicationIdentifier' as const;

export type KeylessConfigKey = `${typeof KEYLESS_CONFIG_KEY_PREFIX}-${string}`;

export function normalizeConnectApiUrl(apiUrl: string): string {
  return apiUrl.trim().replace(/\/$/, '');
}

export function getKeylessConfigKey(apiUrl: string): KeylessConfigKey {
  const normalized = normalizeConnectApiUrl(apiUrl);
  const hash = createHash('sha256').update(normalized).digest('hex').slice(0, 12);

  return `${KEYLESS_CONFIG_KEY_PREFIX}-${hash}`;
}
