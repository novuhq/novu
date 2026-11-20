import type { IncomingMessage } from 'node:http';
import { isIP } from 'node:net';
import { getClientIp as getClientIpFromProxyHeaders } from 'request-ip';

/**
 * The caller's IP, as the one value request logs, logs and per-IP limits agree on.
 *
 * CLIENT_IP_HEADER names a single-IP header that the edge proxy sets and overwrites
 * (`cf-connecting-ip` on Novu Cloud). When it is set, only that header is trusted, and a
 * missing or invalid value falls back to the socket address, never to other proxy headers.
 * When it is unset, the first matching proxy header wins, which clients can set themselves.
 */
export function getClientIp(req: IncomingMessage): string | undefined {
  const trustedHeader = process.env.CLIENT_IP_HEADER?.trim().toLowerCase();

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
