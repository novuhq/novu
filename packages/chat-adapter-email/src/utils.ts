import { createHash, randomUUID } from 'node:crypto';

// Use [^<>] to prevent catastrophic backtracking on adversarial inputs with many '<' chars.
const EMAIL_ANGLE_BRACKET_RE = /<([^<>]+)>/;
const DISPLAY_NAME_RE = /^([^<]+)<[^<>]+>$/;
const SAFE_DOMAIN_RE = /^[a-z0-9.-]+$/i;

export function hashMessageId(messageId: string): string {
  return createHash('sha256').update(messageId).digest('hex').slice(0, 16);
}

export function parseEmailAddress(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(EMAIL_ANGLE_BRACKET_RE);

  return (match?.[1] ?? trimmed).toLowerCase();
}

export function extractDisplayName(from: string): string {
  const match = from.match(DISPLAY_NAME_RE);

  return match?.[1]?.trim() ?? from;
}

export function generateMessageId(fromAddress: string): string {
  const candidateDomain = fromAddress.split('@').at(-1)?.trim().toLowerCase();
  const domain = candidateDomain && SAFE_DOMAIN_RE.test(candidateDomain) ? candidateDomain : 'novu.co';

  return `<${randomUUID()}@${domain}>`;
}

export function stripHtml(html: string): string {
  return html.replace(/<[^<>]*>/g, '').trim();
}
