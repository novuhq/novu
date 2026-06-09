import { BlockList, isIPv4, isIPv6 } from 'node:net';

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

type Ipv6Hextets = [number, number, number, number, number, number, number, number];

function parseHextet(part: string): number | null {
  if (part === '') {
    return null;
  }

  const value = parseInt(part, 16);

  if (!Number.isInteger(value) || value < 0 || value > 0xffff) {
    return null;
  }

  return value;
}

function expandIpv6Hextets(ip: string): Ipv6Hextets | null {
  const lower = ip.toLowerCase();

  if (!lower.includes('::')) {
    const parts = lower.split(':');

    if (parts.length !== 8) {
      return null;
    }

    const hextets: number[] = [];

    for (const part of parts) {
      const parsed = parseHextet(part);

      if (parsed === null) {
        return null;
      }

      hextets.push(parsed);
    }

    return hextets as Ipv6Hextets;
  }

  const [head, tail] = lower.split('::');
  const headParts = head ? head.split(':') : [];
  const tailParts = tail ? tail.split(':') : [];
  const missing = 8 - headParts.length - tailParts.length;

  if (missing < 0) {
    return null;
  }

  const hextets: number[] = [];

  for (const part of headParts) {
    const parsed = parseHextet(part);

    if (parsed === null) {
      return null;
    }

    hextets.push(parsed);
  }

  for (let index = 0; index < missing; index += 1) {
    hextets.push(0);
  }

  for (const part of tailParts) {
    const parsed = parseHextet(part);

    if (parsed === null) {
      return null;
    }

    hextets.push(parsed);
  }

  return hextets as Ipv6Hextets;
}

function hextetsToIpv4(highHextet: number, lowHextet: number): string {
  return [
    (highHextet >> 8) & 0xff,
    highHextet & 0xff,
    (lowHextet >> 8) & 0xff,
    lowHextet & 0xff,
  ].join('.');
}

function looksLikeTransitionEncoding(ip: string): boolean {
  const lower = ip.toLowerCase();

  return /^::\d/.test(lower) || lower.startsWith('64:ff9b:') || lower.startsWith('2002:');
}

function extractTransitionEmbeddedIpv4(ip: string): string | null | 'invalid' {
  const dottedCompatibleMatch = /^::(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(ip);
  const dottedCompatibleIpv4 = dottedCompatibleMatch?.[1];

  if (dottedCompatibleIpv4) {
    return isIPv4(dottedCompatibleIpv4) ? dottedCompatibleIpv4 : 'invalid';
  }

  const hextets = expandIpv6Hextets(ip);

  if (!hextets) {
    return looksLikeTransitionEncoding(ip) ? 'invalid' : null;
  }

  const [h0, h1, h2, h3, h4, h5, h6, h7] = hextets;

  if (h0 === 0 && h1 === 0 && h2 === 0 && h3 === 0 && h4 === 0 && h5 === 0) {
    const embedded = hextetsToIpv4(h6, h7);

    return isIPv4(embedded) ? embedded : 'invalid';
  }

  if (h0 === 0x64 && h1 === 0xff9b && h2 === 0 && h3 === 0 && h4 === 0 && h5 === 0) {
    const embedded = hextetsToIpv4(h6, h7);

    return isIPv4(embedded) ? embedded : 'invalid';
  }

  if (h0 === 0x2002) {
    const embedded = hextetsToIpv4(h1, h2);

    return isIPv4(embedded) ? embedded : 'invalid';
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

  /* IPv4-mapped ::ffff:x.x.x.x — BlockList decodes these when checked as ipv6. */
  if (PRIVATE_IPV4_BLOCKLIST.check(ip, 'ipv6')) {
    return true;
  }

  const embeddedIpv4 = extractTransitionEmbeddedIpv4(ip);

  if (embeddedIpv4 === 'invalid') {
    return true;
  }

  if (embeddedIpv4 !== null) {
    return isPrivateIpv4(embeddedIpv4);
  }

  return false;
}

/**
 * Strips URL-style brackets from an IPv6 literal hostname so DNS and IP
 * classification see the bare address (e.g. `[::ffff:a9fe:a9fe]` → `::ffff:a9fe:a9fe`).
 */
export function normalizeHostnameForLookup(hostname: string): string {
  return hostname.toLowerCase().replace(/^\[(.*)\]$/, '$1');
}

/**
 * Returns true for IPs that are loopback, RFC1918 private, RFC6598 shared (CGNAT),
 * link-local, unique-local IPv6 (fc00::/7), IPv6 loopback/link-local, IPv4-mapped
 * IPv6 of any of these, or the unspecified 0.0.0.0 address.
 *
 * Malformed transition encodings that look like embedded IPv4 fail closed (blocked).
 */
export function isPrivateIp(ip: string): boolean {
  const normalized = normalizeHostnameForLookup(ip);

  if (isIPv4(normalized)) {
    return isPrivateIpv4(normalized);
  }

  if (isIPv6(normalized)) {
    return isPrivateIpv6(normalized);
  }

  if (/^::(\d{1,3}(?:\.\d{1,3}){3})$/i.test(normalized)) {
    return true;
  }

  return false;
}
