/**
 * Resolves the Bird API base URL for a key like `bk_eu1_...` or `bm_us1_...`.
 * An explicit `baseUrl` (local development or a self-hosted gateway) wins over
 * region inference, mirroring the official Bird SDK behavior.
 */
export function resolveBirdBaseUrl(apiKey: string, baseUrl?: string): string {
  if (baseUrl) {
    return baseUrl.replace(/\/$/, '');
  }

  const match = /^b[kms]_([^_]+)_/.exec(apiKey || '');

  if (match?.[1]) {
    return `https://${match[1]}.platform.bird.com`;
  }

  throw new Error(
    'Could not infer Bird region from API key. Use a key like bk_eu1_... or bk_us1_... or provide baseUrl.'
  );
}
