import { promises as dnsPromises } from 'node:dns';

const DNS_TIMEOUT_MS = 5000;

const DNSBL_ZONES = ['zen.spamhaus.org', 'b.barracudacentral.org', 'dnsbl.sorbs.net'] as const;

export function isPrivateOrLoopbackIpv4(ip: string): boolean {
  const parts = ip.split('.').map((p) => Number(p));

  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return true;
  }

  const [a, b] = parts;

  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;

  return false;
}

export async function withDnsTimeout<T>(promise: Promise<T>, ms: number = DNS_TIMEOUT_MS): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('dns_timeout')), ms);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export function reverseIpv4ForDnsbl(ip: string): string {
  const parts = ip.split('.');

  if (parts.length !== 4) {
    throw new Error('invalid_ipv4');
  }

  return [...parts].reverse().join('.');
}

export async function isIpv4ListedOnDnsblZone(ip: string, zone: string): Promise<boolean> {
  const reversed = reverseIpv4ForDnsbl(ip);
  const query = `${reversed}.${zone}`;

  try {
    const addresses = await withDnsTimeout(dnsPromises.resolve4(query));

    return addresses.some((addr) => addr.startsWith('127.'));
  } catch {
    return false;
  }
}

export async function checkMailServerIpsOnDnsbl(ips: string[]): Promise<{ ip: string; zone: string }[]> {
  const listed: { ip: string; zone: string }[] = [];

  for (const ip of ips) {
    if (isPrivateOrLoopbackIpv4(ip)) {
      continue;
    }

    for (const zone of DNSBL_ZONES) {
      const hit = await isIpv4ListedOnDnsblZone(ip, zone);

      if (hit) {
        listed.push({ ip, zone });
      }
    }
  }

  return listed;
}

export async function resolveHostnameToIpv4(hostname: string): Promise<string[]> {
  const normalized = hostname.replace(/\.$/, '');

  try {
    return await withDnsTimeout(dnsPromises.resolve4(normalized));
  } catch {
    return [];
  }
}
