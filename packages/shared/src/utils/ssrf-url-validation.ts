import * as dns from 'node:dns';
import { BlockList, isIPv4, isIPv6 } from 'node:net';
import { LRUCache } from 'lru-cache';

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

const PRIVATE_IPV4_BLOCKLIST = new BlockList();
PRIVATE_IPV4_BLOCKLIST.addAddress('0.0.0.0', 'ipv4');
PRIVATE_IPV4_BLOCKLIST.addSubnet('10.0.0.0', 8, 'ipv4');
PRIVATE_IPV4_BLOCKLIST.addSubnet('127.0.0.0', 8, 'ipv4');
PRIVATE_IPV4_BLOCKLIST.addSubnet('169.254.0.0', 16, 'ipv4');
PRIVATE_IPV4_BLOCKLIST.addSubnet('172.16.0.0', 12, 'ipv4');
PRIVATE_IPV4_BLOCKLIST.addSubnet('192.168.0.0', 16, 'ipv4');
/* RFC6598 shared address space (100.64.0.0/10) — cloud metadata, CGNAT */
PRIVATE_IPV4_BLOCKLIST.addSubnet('100.64.0.0', 10, 'ipv4');

const PRIVATE_IPV6_BLOCKLIST = new BlockList();
PRIVATE_IPV6_BLOCKLIST.addAddress('::', 'ipv6');
PRIVATE_IPV6_BLOCKLIST.addAddress('::1', 'ipv6');
/* ULA fc00::/7 */
PRIVATE_IPV6_BLOCKLIST.addSubnet('fc00::', 7, 'ipv6');
/* Link-local fe80::/10 */
PRIVATE_IPV6_BLOCKLIST.addSubnet('fe80::', 10, 'ipv6');

function expandIpv6Hextets(ip: string): number[] | null {
  const lower = ip.toLowerCase();

  if (!lower.includes('::')) {
    const parts = lower.split(':');

    if (parts.length !== 8) {
      return null;
    }

    return parts.map((part) => parseInt(part, 16));
  }

  const [head, tail] = lower.split('::');
  const headParts = head ? head.split(':') : [];
  const tailParts = tail ? tail.split(':') : [];
  const missing = 8 - headParts.length - tailParts.length;

  if (missing < 0) {
    return null;
  }

  return [
    ...headParts.map((part) => parseInt(part, 16)),
    ...Array.from({ length: missing }, () => 0),
    ...tailParts.map((part) => parseInt(part, 16)),
  ];
}

function hextetsToIpv4(highHextet: number, lowHextet: number): string {
  return [
    (highHextet >> 8) & 0xff,
    highHextet & 0xff,
    (lowHextet >> 8) & 0xff,
    lowHextet & 0xff,
  ].join('.');
}

function extractEmbeddedIpv4(ip: string): string | null {
  const dottedMappedMatch = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(ip);
  const dottedMappedIpv4 = dottedMappedMatch?.[1];

  if (dottedMappedIpv4) {
    return dottedMappedIpv4;
  }

  const dottedCompatibleMatch = /^::(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(ip);
  const dottedCompatibleIpv4 = dottedCompatibleMatch?.[1];

  if (dottedCompatibleIpv4) {
    return dottedCompatibleIpv4;
  }

  const hextets = expandIpv6Hextets(ip);

  if (!hextets || hextets.length !== 8) {
    return null;
  }

  const [h0, h1, h2, h3, h4, h5, h6, h7] = hextets as [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ];

  if (h5 === 0xffff) {
    return hextetsToIpv4(h6, h7);
  }

  if (h0 === 0 && h1 === 0 && h2 === 0 && h3 === 0 && h4 === 0 && h5 === 0) {
    return hextetsToIpv4(h6, h7);
  }

  if (h0 === 0x64 && h1 === 0xff9b && h2 === 0 && h3 === 0 && h4 === 0 && h5 === 0) {
    return hextetsToIpv4(h6, h7);
  }

  if (h0 === 0x2002) {
    return hextetsToIpv4(h1, h2);
  }

  return null;
}

function isPrivateIpv4(ip: string): boolean {
  return PRIVATE_IPV4_BLOCKLIST.check(ip, 'ipv4');
}

function isPrivateIpv6(ip: string): boolean {
  if (PRIVATE_IPV6_BLOCKLIST.check(ip, 'ipv6')) {
    return true;
  }

  const embeddedIpv4 = extractEmbeddedIpv4(ip);

  if (embeddedIpv4 && isIPv4(embeddedIpv4)) {
    return isPrivateIpv4(embeddedIpv4);
  }

  return false;
}

/**
 * Returns true for IPs that are loopback, RFC1918 private, RFC6598 shared (CGNAT),
 * link-local, unique-local IPv6 (fc00::/7), IPv6 loopback/link-local, IPv4-mapped
 * IPv6 of any of these, or the unspecified 0.0.0.0 address.
 *
 * Used to reject SSRF candidates at validation **and** at connect time.
 */
export function isPrivateIp(ip: string): boolean {
  if (isIPv4(ip)) {
    return isPrivateIpv4(ip);
  }

  if (isIPv6(ip)) {
    return isPrivateIpv6(ip);
  }

  return false;
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
  const lower = hostname.toLowerCase();
  let addresses: dns.LookupAddress[] | undefined;

  if (options.useCache) {
    addresses = DNS_CACHE.get(lower);
  }

  if (!addresses) {
    try {
      addresses = await dns.promises.lookup(lower, { all: true });
    } catch {
      throw new SsrfBlockedError('DNS_LOOKUP_FAILED', `Unable to resolve hostname "${lower}".`, { hostname: lower });
    }

    if (options.useCache) {
      DNS_CACHE.set(lower, addresses);
    }
  }

  for (const { address } of addresses) {
    if (isPrivateIp(address)) {
      throw new SsrfBlockedError(
        'PRIVATE_IP',
        `Requests to private or reserved IP addresses are not allowed (resolved: ${address}).`,
        { hostname: lower, resolvedAddress: address }
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
