import * as dns from 'node:dns';
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

const DNS_CACHE = new LRUCache<string, dns.LookupAddress[]>({
  max: 500,
  ttl: 1000 * 60 * 5, // 5 minutes
});

export function isPrivateIp(ip: string): boolean {
  const privateRanges = [
    /^0\.0\.0\.0$/i,
    /^127\./,
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[01])\./,
    /^192\.168\./,
    /^169\.254\./,
    /^::ffff:127\./i,
    /^::ffff:10\./i,
    /^::ffff:172\.(1[6-9]|2[0-9]|3[01])\./i,
    /^::ffff:192\.168\./i,
    /^::ffff:169\.254\./i,
    /^::1$/i,
    /* ULA fc00::/7 (fc00–fdff first hextet) */
    /^f[cd][0-9a-f]{2}:/i,
    /^::ffff:f[cd][0-9a-f]{2}:/i,
    /* Link-local fe80::/10 (fe80–febf first hextet) */
    /^fe[89ab][0-9a-f]:/i,
    /^::ffff:fe[89ab][0-9a-f]:/i,
  ];

  return privateRanges.some((range) => range.test(ip));
}

/**
 * Validates that a URL is safe to fetch server-side (http/https only, no private IPs after DNS resolution).
 * Returns an error message string if blocked, or null if allowed.
 */
export async function validateUrlSsrf(url: string): Promise<string | null> {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    return 'Invalid URL format.';
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return `URL scheme "${parsed.protocol}" is not allowed. Only http and https are permitted.`;
  }

  const hostname = parsed.hostname.toLowerCase();

  const blockedHostnames = ['localhost', 'metadata.google.internal'];

  if (blockedHostnames.includes(hostname)) {
    return `Requests to "${hostname}" are not allowed.`;
  }

  let addresses = DNS_CACHE.get(hostname);

  if (!addresses) {
    try {
      addresses = await dns.promises.lookup(hostname, { all: true });
      DNS_CACHE.set(hostname, addresses);
    } catch {
      return `Unable to resolve hostname "${hostname}".`;
    }
  }

  for (const { address } of addresses) {
    if (isPrivateIp(address)) {
      return `Requests to private or reserved IP addresses are not allowed (resolved: ${address}).`;
    }
  }

  return null;
}
