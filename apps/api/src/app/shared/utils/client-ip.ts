import { createHmac } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import { isIP } from 'node:net';
import { getClientIp as getClientIpFromProxyHeaders } from 'request-ip';
import { areHexDigestsEqual } from '../helpers/timing-safe-equal';

/** Cloudflare sets and overwrites it on every request that reaches the Novu Cloud API. */
const NOVU_CLOUD_CLIENT_IP_HEADER = 'cf-connecting-ip';

/**
 * The Agent Inbox site forwards its visitors' calls, so Cloudflare sees the site instead of the visitor.
 * The site sends the visitor's IP in these headers, signed with `AGENT_INBOX_DASHBOARD_API_SECRET`.
 */
export const AGENT_INBOX_CLIENT_IP_HEADER = 'x-agent-inbox-client-ip';
export const AGENT_INBOX_CLIENT_IP_SIGNATURE_HEADER = 'x-agent-inbox-client-ip-signature';

/** Request headers reach the logs, so a signature only works this long. */
const AGENT_INBOX_SIGNATURE_MAX_AGE_SECONDS = 5 * 60;

/**
 * The caller's IP, as the one value request logs, logs and per-IP limits agree on.
 *
 * A visitor IP the Agent Inbox site signed comes first. Next, CLIENT_IP_HEADER names a single-IP
 * header that the edge proxy sets and overwrites. Novu Cloud (`NOVU_ENTERPRISE=true` without
 * `IS_SELF_HOSTED=true`) defaults it to `cf-connecting-ip`, and an empty value turns that default
 * off. When a header applies, only that header is trusted, and a missing or invalid value falls
 * back to the socket address, never to other proxy headers. Otherwise the first matching proxy
 * header wins, which clients can set themselves.
 */
export function getClientIp(req: IncomingMessage): string | undefined {
  const agentInboxClientIp = readAgentInboxClientIp(req);

  if (agentInboxClientIp) {
    return agentInboxClientIp;
  }

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

/**
 * The visitor's IP from the Agent Inbox site. The signature is `<unix seconds>.<hex HMAC-SHA256 of
 * "<unix seconds>.<ip>">`, and it must check and be at most five minutes old.
 */
function readAgentInboxClientIp(req: IncomingMessage): string | undefined {
  const secret = process.env.AGENT_INBOX_DASHBOARD_API_SECRET;
  const clientIp = req.headers[AGENT_INBOX_CLIENT_IP_HEADER];
  const signature = req.headers[AGENT_INBOX_CLIENT_IP_SIGNATURE_HEADER];

  if (!secret || typeof clientIp !== 'string' || typeof signature !== 'string' || !isIP(clientIp)) {
    return undefined;
  }

  const [timestamp, digest] = signature.split('.');
  const signedAt = Number(timestamp);

  if (!Number.isInteger(signedAt) || Math.abs(Date.now() / 1000 - signedAt) > AGENT_INBOX_SIGNATURE_MAX_AGE_SECONDS) {
    return undefined;
  }

  const expected = createHmac('sha256', secret).update(`${timestamp}.${clientIp}`).digest('hex');

  return areHexDigestsEqual(expected, digest) ? clientIp : undefined;
}
