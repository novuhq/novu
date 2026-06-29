import * as dns from 'node:dns';
import { isIP } from 'node:net';
import { LRUCache } from 'lru-cache';
import { isAddressAllowedByOutboundAllowList, isHostnameAllowedByOutboundAllowList } from './outbound-ssrf-allow-list';
import { isPrivateIp, normalizeHostnameForLookup } from './private-ip-classification';

export { isPrivateIp, normalizeHostnameForLookup };

/**
 * Resolves a webhook-style URL for outbound HTTP requests.
 * Host-only or path-first values (no scheme) are treated as https, matching axios behavior.
 */
export function normalizeOutboundHttpUrl(raw: string): string | null {
  const trimmed = raw.trim();

  if (!trimmed) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);

    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return trimmed;
    }

    return null;
  } catch {
    // Continue: scheme-less host/path (e.g. example.com/hook)
  }

  const withHttps = `https://${trimmed}`;

  try {
    const parsed = new URL(withHttps);

    if (!parsed.hostname) {
      return null;
    }

    return withHttps;
  } catch {
    return null;
  }
}

const DNS_CACHE = new LRUCache<string, dns.LookupAddress[]>({
  max: 500,
  ttl: 1000 * 60 * 5, // 5 minutes
});

/**
 * Hostnames whose entire purpose is to expose internal/metadata endpoints.
 * Reject these by name, before DNS resolution, since the resolver could be
 * tricked into returning a public IP that proxies to a private destination.
 */
const BLOCKED_HOSTNAMES = new Set(['localhost', 'metadata.google.internal']);

/**
 * Symbolic error codes for SSRF policy rejections. Allows callers to map to
 * structured responses without parsing the human-readable message.
 */
export type SsrfBlockReason =
  | 'INVALID_URL'
  | 'UNSUPPORTED_SCHEME'
  | 'CREDENTIALS_IN_URL'
  | 'BLOCKED_HOSTNAME'
  | 'DNS_LOOKUP_FAILED'
  | 'PRIVATE_IP'
  | 'CROSS_ORIGIN_METHOD_PRESERVING_REDIRECT';

/**
 * Thrown by the safe outbound HTTP layer when a URL or its resolved address is
 * blocked by SSRF policy. Carries a machine-readable {@link SsrfBlockReason}.
 */
export class SsrfBlockedError extends Error {
  readonly reason: SsrfBlockReason;
  readonly resolvedAddress?: string;
  readonly hostname?: string;

  constructor(reason: SsrfBlockReason, message: string, extra?: { resolvedAddress?: string; hostname?: string }) {
    super(message);
    this.name = 'SsrfBlockedError';
    this.reason = reason;
    this.resolvedAddress = extra?.resolvedAddress;
    this.hostname = extra?.hostname;
  }
}

/**
 * Validates the URL string itself (no DNS):
 *  - must parse
 *  - must be http/https
 *  - must not embed credentials
 *  - must not target a blocked hostname
 *
 * Throws {@link SsrfBlockedError} on any rejection. Returns the parsed URL on success.
 *
 * This is intentionally synchronous and side-effect-free. Use it before kicking
 * off any outbound request, including before re-following a redirect.
 */
export function assertSafeOutboundUrl(input: string | URL): URL {
  let parsed: URL;

  try {
    parsed = typeof input === 'string' ? new URL(input) : input;
  } catch {
    throw new SsrfBlockedError('INVALID_URL', 'Invalid URL format.');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new SsrfBlockedError(
      'UNSUPPORTED_SCHEME',
      `URL scheme "${parsed.protocol}" is not allowed. Only http and https are permitted.`
    );
  }

  if (parsed.username || parsed.password) {
    throw new SsrfBlockedError('CREDENTIALS_IN_URL', 'URLs with embedded credentials are not allowed.');
  }

  const hostname = parsed.hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new SsrfBlockedError('BLOCKED_HOSTNAME', `Requests to "${hostname}" are not allowed.`, { hostname });
  }

  return parsed;
}

/**
 * Resolves all IP addresses for the hostname and asserts every one is public.
 *
 * Caching policy: by default this skips the cache so the resolver is consulted
 * fresh per call. This is the safe default for the connect-time guard — caching
 * the DNS answer between validation and connection is exactly the
 * DNS-rebinding window we are trying to close. The cache parameter exists only
 * for the legacy {@link validateUrlSsrf} entry point, which has documented
 * cache semantics.
 *
 * Throws {@link SsrfBlockedError} if resolution fails or if any returned
 * address is private/reserved. Returns all resolved addresses on success.
 */
export async function resolvePublicAddresses(
  hostname: string,
  options: { useCache?: boolean } = {}
): Promise<dns.LookupAddress[]> {
  const normalized = normalizeHostnameForLookup(hostname);
  let addresses: dns.LookupAddress[] | undefined;

  if (options.useCache) {
    addresses = DNS_CACHE.get(normalized);
  }

  if (!addresses) {
    const literalFamily = isIP(normalized);

    if (literalFamily !== 0) {
      addresses = [{ address: normalized, family: literalFamily }];
    } else {
      try {
        addresses = await dns.promises.lookup(normalized, { all: true });
      } catch {
        throw new SsrfBlockedError('DNS_LOOKUP_FAILED', `Unable to resolve hostname "${normalized}".`, {
          hostname: normalized,
        });
      }
    }

    if (options.useCache) {
      DNS_CACHE.set(normalized, addresses);
    }
  }

  if (isHostnameAllowedByOutboundAllowList(normalized)) {
    return addresses;
  }

  for (const { address } of addresses) {
    if (isAddressAllowedByOutboundAllowList(address)) {
      continue;
    }

    if (isPrivateIp(address)) {
      throw new SsrfBlockedError(
        'PRIVATE_IP',
        `Requests to private or reserved IP addresses are not allowed (resolved: ${address}).`,
        { hostname: normalized, resolvedAddress: address }
      );
    }
  }

  return addresses;
}

/**
 * Validates that a URL is safe to fetch server-side (http/https only, no private IPs after DNS resolution).
 * Returns an error message string if blocked, or null if allowed.
 *
 * @deprecated This is a one-shot pre-flight check. It does not pin the
 * connection to the validated IP, does not re-validate redirect targets, and
 * caches DNS answers, all of which leave SSRF holes open via redirect chains
 * and DNS rebinding. Prefer the safe outbound HTTP client which validates
 * at connect time and re-runs the policy on every redirect.
 */
export async function validateUrlSsrf(url: string): Promise<string | null> {
  try {
    assertSafeOutboundUrl(url);
  } catch (err) {
    if (err instanceof SsrfBlockedError) {
      return err.message;
    }
    throw err;
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return 'Invalid URL format.';
  }

  try {
    await resolvePublicAddresses(parsed.hostname, { useCache: true });
  } catch (err) {
    if (err instanceof SsrfBlockedError) {
      return err.message;
    }
    throw err;
  }

  return null;
}
