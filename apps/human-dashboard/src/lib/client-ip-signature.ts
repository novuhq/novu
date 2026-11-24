import { createHmac } from 'node:crypto';

/**
 * The caller's IP address on a call `/api` forwards, and its signature. On Novu Cloud the API reads the caller
 * from Cloudflare, which sees this site instead, so it takes the caller's from these headers when the signature
 * checks with the secret both share (`AGENT_INBOX_DASHBOARD_API_SECRET`). Kept free of Next.js / server-only so
 * unit tests can check the signature against the one the API expects.
 */
export const AGENT_INBOX_CLIENT_IP_HEADER = 'x-agent-inbox-client-ip';
export const AGENT_INBOX_CLIENT_IP_SIGNATURE_HEADER = 'x-agent-inbox-client-ip-signature';

/**
 * `<unix seconds>.<hex HMAC-SHA256 of "<unix seconds>.<ip>">`. The API takes a signature for five minutes only,
 * so one that ends up in a log can't stand in for the caller later.
 */
export function signClientIp(clientIp: string, secret: string, now: number = Date.now()): string {
  const timestamp = Math.floor(now / 1000);
  const digest = createHmac('sha256', secret).update(`${timestamp}.${clientIp}`).digest('hex');

  return `${timestamp}.${digest}`;
}
