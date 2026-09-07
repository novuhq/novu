import { BlockList, isIP } from 'node:net';

const PRODUCTION_ENV_KEY = 'NOVU_SAFE_OUTBOUND_ALLOW';
const TEST_ENV_KEY = 'NOVU_SAFE_OUTBOUND_TEST_ALLOW_IPS';

type ParsedAllowEntry =
  | { type: 'ip'; value: string }
  | { type: 'cidr'; blocklist: BlockList }
  | { type: 'hostname'; value: string }
  | { type: 'hostname-suffix'; suffix: string };

let cachedEntries: ParsedAllowEntry[] | null = null;
let cachedEnvRaw: string | undefined;

function parseCidr(entry: string): BlockList | null {
  const match = entry.match(/^([^/]+)\/(\d+)$/);
  if (!match) {
    return null;
  }

  const network = match[1];
  const prefixStr = match[2];

  if (!network || !prefixStr) {
    return null;
  }

  const prefix = Number(prefixStr);
  const family = isIP(network);

  if (family === 0 || !Number.isInteger(prefix)) {
    return null;
  }

  const blocklist = new BlockList();

  try {
    blocklist.addSubnet(network, prefix, family === 4 ? 'ipv4' : 'ipv6');

    return blocklist;
  } catch {
    return null;
  }
}

function parseEntry(raw: string): ParsedAllowEntry | null {
  const entry = raw.trim();

  if (!entry) {
    return null;
  }

  if (entry.startsWith('*.')) {
    return { type: 'hostname-suffix', suffix: entry.slice(1).toLowerCase() };
  }

  if (entry.startsWith('.')) {
    return { type: 'hostname-suffix', suffix: entry.toLowerCase() };
  }

  if (entry.includes('/')) {
    const blocklist = parseCidr(entry);

    if (blocklist) {
      return { type: 'cidr', blocklist };
    }

    return null;
  }

  if (isIP(entry) !== 0) {
    return { type: 'ip', value: entry };
  }

  if (/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/i.test(entry)) {
    return { type: 'hostname', value: entry.toLowerCase() };
  }

  return null;
}

function getCombinedAllowListRaw(): string {
  const production = process.env[PRODUCTION_ENV_KEY] ?? '';
  const test = process.env[TEST_ENV_KEY] ?? '';

  return [production, test].filter(Boolean).join(',');
}

function getAllowListEntries(): ParsedAllowEntry[] {
  const combined = getCombinedAllowListRaw();

  if (cachedEnvRaw === combined && cachedEntries) {
    return cachedEntries;
  }

  cachedEnvRaw = combined;
  cachedEntries = combined
    .split(',')
    .map(parseEntry)
    .filter((entry): entry is ParsedAllowEntry => entry !== null);

  return cachedEntries;
}

/** @internal Test helper — clears the parsed allow-list cache between cases. */
export function resetOutboundSsrfAllowListCacheForTests(): void {
  cachedEntries = null;
  cachedEnvRaw = undefined;
}

export function isHostnameAllowedByOutboundAllowList(hostname: string): boolean {
  const normalized = hostname.toLowerCase();

  for (const entry of getAllowListEntries()) {
    if (entry.type === 'hostname' && normalized === entry.value) {
      return true;
    }

    if (entry.type === 'hostname-suffix') {
      const bareSuffix = entry.suffix.startsWith('.') ? entry.suffix.slice(1) : entry.suffix;

      if (normalized === bareSuffix || normalized.endsWith(entry.suffix)) {
        return true;
      }
    }
  }

  return false;
}

export function isAddressAllowedByOutboundAllowList(address: string): boolean {
  for (const entry of getAllowListEntries()) {
    if (entry.type === 'ip' && entry.value === address) {
      return true;
    }

    if (entry.type === 'cidr') {
      const family = isIP(address);

      if (family !== 0 && entry.blocklist.check(address, family === 4 ? 'ipv4' : 'ipv6')) {
        return true;
      }
    }
  }

  return false;
}

export function isOutboundAddressAllowed(hostname: string, address: string): boolean {
  return isHostnameAllowedByOutboundAllowList(hostname) || isAddressAllowedByOutboundAllowList(address);
}
