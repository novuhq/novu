import { createHash, randomUUID } from 'node:crypto';

const EMAIL_ANGLE_BRACKET_RE = /<([^>]+)>/;
const DISPLAY_NAME_RE = /^([^<]+)<[^>]+>$/;

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
  const domain = fromAddress.split('@')[1] || 'novu.co';

  return `<${randomUUID()}@${domain}>`;
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').trim();
}
