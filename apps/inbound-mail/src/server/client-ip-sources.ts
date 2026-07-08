import { isPrivateIp, normalizeHostnameForLookup } from '@novu/application-generic';

export interface ClientIpSourceCandidate {
  rank: number;
  category: 'smtp-session' | 'email-header' | 'received';
  property: string;
  value: string | null;
  isPrivate: boolean | null;
  raw?: string;
}

export interface ClientIpSourceDebug {
  spfEvaluatedWith: {
    ip: string;
    helo: string;
    property: 'session.remoteAddress' | 'session.clientHostname';
  };
  orderedCandidates: ClientIpSourceCandidate[];
  firstPublicCandidate: ClientIpSourceCandidate | null;
  receivedHeaders: string[];
}

interface HeaderLookup {
  get(name: string): string | string[] | undefined;
}

/*
 * Mirrors the precedence documented by @supercharge/request-ip for HTTP
 * requests. SMTP has no Express req object, so the first block maps the
 * closest session/socket equivalents; the second block reads the same proxy
 * headers if an upstream MTA or gateway injected them into the message.
 */
const EMAIL_HEADER_IP_KEYS = [
  'x-forwarded-for',
  'x-forwarded',
  'forwarded',
  'forwarded-for',
  'x-client-ip',
  'x-real-ip',
  'cf-connecting-ip',
  'fastly-client-ip',
  'true-client-ip',
  'x-cluster-client-ip',
] as const;

function asString(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();

    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function classifyIp(value: string | null): boolean | null {
  if (!value) {
    return null;
  }

  const normalized = normalizeHostnameForLookup(value);

  try {
    return isPrivateIp(normalized);
  } catch {
    return null;
  }
}

function readMapLikeValue(mapLike: unknown, key: string): string | null {
  if (mapLike instanceof Map) {
    return asString(mapLike.get(key));
  }

  if (mapLike && typeof mapLike === 'object') {
    return asString((mapLike as Record<string, unknown>)[key]);
  }

  return null;
}

function readNestedRemoteAddress(source: unknown, path: string[]): string | null {
  let current: unknown = source;

  for (const segment of path) {
    if (!current || typeof current !== 'object') {
      return null;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return asString(current);
}

function extractFirstIpFromForwardedHeader(value: string): string | null {
  const forMatch = /(?:^|;|\s)for=(?:"\[([^"\]]+)\]"|\[([^\]]+)\]|"([^";]+)"|([^;\s]+))/i.exec(value);

  if (forMatch) {
    const candidate = forMatch[1] ?? forMatch[2] ?? forMatch[3] ?? forMatch[4] ?? null;

    return candidate ? normalizeHostnameForLookup(candidate) : null;
  }

  return extractFirstIpFromList(value);
}

function extractFirstIpFromList(value: string): string | null {
  const firstSegment = value.split(',')[0]?.trim();

  if (!firstSegment) {
    return null;
  }

  const bracketMatch = /\[([0-9a-f.:]+)\]/i.exec(firstSegment);
  if (bracketMatch?.[1]) {
    return normalizeHostnameForLookup(bracketMatch[1]);
  }

  const ipv4Match = /\b(\d{1,3}(?:\.\d{1,3}){3})\b/.exec(firstSegment);
  if (ipv4Match?.[1]) {
    return ipv4Match[1];
  }

  return normalizeHostnameForLookup(firstSegment.replace(/^::ffff:/i, ''));
}

function extractIpsFromReceivedHeader(value: string): string[] {
  const matches = value.matchAll(/\[([0-9a-f.:]+)\]/gi);
  const ips: string[] = [];

  for (const match of matches) {
    const ip = asString(match[1]);

    if (ip) {
      ips.push(normalizeHostnameForLookup(ip.replace(/^::ffff:/i, '')));
    }
  }

  return ips;
}

function toHeaderLookup(headers: unknown): HeaderLookup | null {
  if (!headers) {
    return null;
  }

  if (headers instanceof Map) {
    return {
      get(name: string) {
        const direct = headers.get(name) ?? headers.get(name.toLowerCase());

        return direct as string | string[] | undefined;
      },
    };
  }

  if (typeof headers === 'object') {
    const record = headers as Record<string, unknown>;

    return {
      get(name: string) {
        const value = record[name] ?? record[name.toLowerCase()];

        return value as string | string[] | undefined;
      },
    };
  }

  return null;
}

function readHeaderValues(lookup: HeaderLookup, name: string): string[] {
  const raw = lookup.get(name);

  if (Array.isArray(raw)) {
    return raw.flatMap((entry) => (typeof entry === 'string' ? [entry] : []));
  }

  if (typeof raw === 'string') {
    return [raw];
  }

  return [];
}

function pushCandidate(
  candidates: ClientIpSourceCandidate[],
  rank: number,
  category: ClientIpSourceCandidate['category'],
  property: string,
  value: string | null,
  raw?: string
): number {
  candidates.push({
    rank,
    category,
    property,
    value,
    isPrivate: classifyIp(value),
    raw,
  });

  return rank + 1;
}

function readHeaderCandidate(
  lookup: HeaderLookup,
  headerName: (typeof EMAIL_HEADER_IP_KEYS)[number]
): { property: string; value: string | null; raw?: string } | null {
  const values = readHeaderValues(lookup, headerName);

  if (values.length === 0) {
    return null;
  }

  const raw = values[0];
  const value =
    headerName === 'forwarded' || headerName === 'x-forwarded'
      ? extractFirstIpFromForwardedHeader(raw)
      : extractFirstIpFromList(raw);

  return {
    property: `headers.${headerName}`,
    value,
    raw,
  };
}

export function collectClientIpSources(
  connection: Record<string, unknown>,
  parsedEmailHeaders: unknown
): ClientIpSourceDebug {
  const candidates: ClientIpSourceCandidate[] = [];
  let rank = 1;

  const smtpSessionChecks: Array<{ property: string; value: string | null }> = [
    { property: 'session.xForward.ADDR', value: readMapLikeValue(connection.xForward, 'ADDR') },
    { property: 'session.xClient.ADDR', value: readMapLikeValue(connection.xClient, 'ADDR') },
    { property: 'session.xClient.ADDR:DEFAULT', value: readMapLikeValue(connection.xClient, 'ADDR:DEFAULT') },
    { property: 'session.remoteAddress', value: asString(connection.remoteAddress) },
    { property: 'session.remotePort', value: asString(connection.remotePort) },
    { property: 'session.localAddress', value: asString(connection.localAddress) },
    { property: 'session.localPort', value: asString(connection.localPort) },
    { property: 'session.clientHostname', value: asString(connection.clientHostname) },
    { property: 'session.hostNameAppearsAs', value: asString(connection.hostNameAppearsAs) },
    {
      property: 'session.socket.remoteAddress',
      value: readNestedRemoteAddress(connection.socket, ['remoteAddress']),
    },
    {
      property: 'session.connection.remoteAddress',
      value: readNestedRemoteAddress(connection.connection, ['remoteAddress']),
    },
    {
      property: 'session.connection.socket.remoteAddress',
      value: readNestedRemoteAddress(connection.connection, ['socket', 'remoteAddress']),
    },
  ];

  for (const check of smtpSessionChecks) {
    rank = pushCandidate(candidates, rank, 'smtp-session', check.property, check.value);
  }

  const headerLookup = toHeaderLookup(parsedEmailHeaders);
  const receivedHeaders = headerLookup ? readHeaderValues(headerLookup, 'received') : [];

  if (headerLookup) {
    for (const headerName of EMAIL_HEADER_IP_KEYS) {
      const headerCandidate = readHeaderCandidate(headerLookup, headerName);

      if (!headerCandidate) {
        continue;
      }

      rank = pushCandidate(
        candidates,
        rank,
        'email-header',
        headerCandidate.property,
        headerCandidate.value,
        headerCandidate.raw
      );
    }
  }

  for (const [index, receivedHeader] of receivedHeaders.entries()) {
    const ips = extractIpsFromReceivedHeader(receivedHeader);

    for (const [ipIndex, ip] of ips.entries()) {
      rank = pushCandidate(
        candidates,
        rank,
        'received',
        `headers.received[${index}].ip[${ipIndex}]`,
        ip,
        receivedHeader
      );
    }
  }

  const firstPublicCandidate = candidates.find((candidate) => candidate.value && candidate.isPrivate === false) ?? null;

  return {
    spfEvaluatedWith: {
      ip: asString(connection.remoteAddress) ?? '',
      helo: asString(connection.clientHostname) ?? '',
      property: 'session.remoteAddress',
    },
    orderedCandidates: candidates,
    firstPublicCandidate,
    receivedHeaders,
  };
}
