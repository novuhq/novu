import type { IncomingMessage } from 'node:http';
import { isIP } from 'node:net';
import { getClientIp as getClientIpFromProxyHeaders } from 'request-ip';

/** Cloudflare sets and overwrites it on every request that reaches the Novu Cloud API. */
const NOVU_CLOUD_CLIENT_IP_HEADER = 'cf-connecting-ip';

/**
 * The caller's IP, as the one value request logs, logs and per-IP limits agree on.
 *
 * CLIENT_IP_HEADER names a single-IP header that the edge proxy sets and overwrites. Novu Cloud
 * (`NOVU_ENTERPRISE=true` without `IS_SELF_HOSTED=true`) defaults it to `cf-connecting-ip`, and an
 * empty value turns that default off. When a header applies, only that header is trusted, and a
 * missing or invalid value falls back to the socket address, never to other proxy headers.
 * Otherwise the first matching proxy header wins, which clients can set themselves.
 */
export function getClientIp(req: IncomingMessage): string | undefined {
  const trustedHeader = (process.env.CLIENT_IP_HEADER ?? defaultClientIpHeader())?.trim().toLowerCase();

  if (!trustedHeader) {
    return getClientIpFromProxyHeaders(req) ?? undefined;
  }

  const value = req.headers[trustedHeader];
  const candidate = typeof value === 'string' ? value.trim() : undefined;

  if (candidate && isIP(candidate)) {
    return candidate;
  }

  return req.socket?.remoteAddress ?? undefined;
}

function defaultClientIpHeader(): string | undefined {
  const isNovuCloud = process.env.IS_SELF_HOSTED !== 'true' && process.env.NOVU_ENTERPRISE === 'true';

  return isNovuCloud ? NOVU_CLOUD_CLIENT_IP_HEADER : undefined;
}
