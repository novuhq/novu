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

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
};

function decodeEntities(text: string): string {
  return text.replace(/&(?:#(\d+)|#x([0-9a-f]+)|([a-z]+));/gi, (match, dec, hex, name) => {
    if (dec) return String.fromCodePoint(Number(dec));
    if (hex) return String.fromCodePoint(parseInt(hex, 16));

    return NAMED_ENTITIES[name.toLowerCase()] ?? match;
  });
}

export function stripHtml(html: string): string {
  const chars: string[] = [];
  let depth = 0;
  for (const ch of html) {
    if (ch === '<') { depth++; continue; }
    if (ch === '>') { if (depth > 0) depth--; continue; }
    if (depth === 0) chars.push(ch);
  }

  return decodeEntities(chars.join('').replace(/\s+/g, ' ')).trim();
}
