/**
 * Resolves the Bird API base URL for a key like `bk_eu1_...` or `bm_us1_...`.
 * An explicit `baseUrl` (local development or a self-hosted gateway) wins over
 * region inference, mirroring the official Bird SDK behavior.
 *
 * The inferred region is strictly validated so a crafted API key cannot break
 * out of the Bird host: only alphanumeric regions are accepted and the final
 * hostname must be `<region>.platform.bird.com`.
 */
const BIRD_REGION_PATTERN = /^[a-z0-9]+$/i;
const BIRD_HOST_SUFFIX = '.platform.bird.com';

export function resolveBirdBaseUrl(apiKey: string, baseUrl?: string): string {
  if (baseUrl) {
    let parsedBaseUrl: URL;

    try {
      parsedBaseUrl = new URL(baseUrl);
    } catch {
      throw new Error('Bird baseUrl must be a valid HTTP or HTTPS URL.');
    }

    if (!['http:', 'https:'].includes(parsedBaseUrl.protocol) || parsedBaseUrl.username || parsedBaseUrl.password) {
      throw new Error('Bird baseUrl must be a valid HTTP or HTTPS URL without embedded credentials.');
    }

    return baseUrl.replace(/\/$/, '');
  }

  const match = /^b[kms]_([^_]+)_/.exec(apiKey || '');
  const region = match?.[1];

  if (!region || !BIRD_REGION_PATTERN.test(region)) {
    throw new Error(
      'Could not infer Bird region from API key. Use a key like bk_eu1_... or bk_us1_... or provide baseUrl.'
    );
  }

  const host = `${region.toLowerCase()}${BIRD_HOST_SUFFIX}`;
  const hostname = new URL(`https://${host}`).hostname;

  if (hostname !== host) {
    throw new Error(
      'Could not infer Bird region from API key. Use a key like bk_eu1_... or bk_us1_... or provide baseUrl.'
    );
  }

  return `https://${host}`;
}
