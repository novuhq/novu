import {
  assertSafeOutboundUrl,
  normalizeOutboundHttpUrl,
  SsrfBlockedError,
} from '@novu/shared/utils/ssrf-url-validation';

const DEFAULT_BLOCKED_PREFIX = 'Infobip base URL blocked';

function isAllowedInfobipHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();

  return normalized === 'api.infobip.com' || normalized.endsWith('.api.infobip.com');
}

export function resolveSafeInfobipBaseUrl(rawUrl: string | undefined, blockedPrefix = DEFAULT_BLOCKED_PREFIX): string {
  const trimmed = rawUrl?.trim();

  if (!trimmed) {
    throw new Error(`${blockedPrefix}: Base URL is required.`);
  }

  const url = normalizeOutboundHttpUrl(trimmed);

  if (!url) {
    throw new Error(`${blockedPrefix}: Invalid URL format.`);
  }

  let parsed: URL;

  try {
    parsed = assertSafeOutboundUrl(url);
  } catch (err) {
    if (err instanceof SsrfBlockedError) {
      throw new Error(`${blockedPrefix}: ${err.message}`);
    }
    throw err;
  }

  if (parsed.protocol !== 'https:') {
    throw new Error(`${blockedPrefix}: Only https URLs are allowed.`);
  }

  if (!isAllowedInfobipHostname(parsed.hostname)) {
    throw new Error(`${blockedPrefix}: Hostname must be an Infobip API endpoint (*.api.infobip.com).`);
  }

  return url;
}
