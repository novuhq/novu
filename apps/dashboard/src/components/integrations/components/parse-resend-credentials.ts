import { CredentialsKeyEnum } from '@novu/shared';

type ResendCredentialField = CredentialsKeyEnum.ApiKey | CredentialsKeyEnum.From | CredentialsKeyEnum.SenderName;

type ParsedResendCredentials = Partial<Record<ResendCredentialField, string>>;

/** Resend API keys start with `re_`. */
const API_KEY_PATTERN = /\bre_[A-Za-z0-9_-]{8,}/;
const EMAIL_PATTERN = /[^\s<>"']+@[^\s<>"']+\.[^\s<>"']+/;
/** `KEY=value`, with an optional `export` in front, as in a .env file or a shell profile. */
const ASSIGNMENT_PATTERN = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*[=:]\s*(.*)$/;

/** The index of the quote that closes the one at the start, skipping quotes escaped with a backslash. */
function findClosingQuote(value: string, quote: string): number {
  for (let index = 1; index < value.length; index += 1) {
    if (value[index] === '\\') index += 1;
    else if (value[index] === quote) return index;
  }

  return -1;
}

function unquote(value: string): string {
  const trimmed = value.trim();
  const quote = trimmed[0];
  if (quote === '"' || quote === "'" || quote === '`') {
    // The value ends at its closing quote: a `#` inside the quotes is part of it, anything after is a comment.
    const closingIndex = findClosingQuote(trimmed, quote);
    if (closingIndex > 0) return trimmed.slice(1, closingIndex).split(`\\${quote}`).join(quote).trim();
  }

  // An unquoted value ends where an inline comment starts.
  return trimmed.replace(/\s+#.*$/, '').trim();
}

/** Splits `Acme <hello@acme.com>` into its name and address; a bare address has no name. */
function parseSender(value: string): { from?: string; senderName?: string } {
  const from = value.match(EMAIL_PATTERN)?.[0];
  if (!from) return {};

  // What comes before the address, without the `<` that opens it or quotes around the name.
  const senderName = value
    .slice(0, value.indexOf(from))
    .replace(/<\s*$/, '')
    .trim()
    .replace(/^["']+|["']+$/g, '')
    .trim();

  return { from, senderName: senderName || undefined };
}

/**
 * True when pasted text is more than a bare value: a Resend API key next to other things, as in a block
 * copied from a .env file. A key or an address on its own is left for the field it was pasted into.
 */
export function isLikelyResendCredentialsBlock(text: string): boolean {
  const trimmed = text.trim();

  return API_KEY_PATTERN.test(trimmed) && /[=:\n]/.test(trimmed);
}

/**
 * Best-effort read of a block of environment variables: the Resend API key wherever it is, and the sender
 * from the variables that name one (`EMAIL_FROM`, `RESEND_FROM_EMAIL`, `SENDER_NAME`, ...).
 */
export function parseResendCredentials(text: string): ParsedResendCredentials {
  const parsed: ParsedResendCredentials = {};
  // Commented-out lines often hold an old key or sender, so they are not read.
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => !line.startsWith('#'));

  const apiKey = lines.join('\n').match(API_KEY_PATTERN)?.[0];
  if (apiKey) parsed[CredentialsKeyEnum.ApiKey] = apiKey;

  for (const line of lines) {
    const assignment = line.match(ASSIGNMENT_PATTERN);
    if (!assignment) continue;

    const name = assignment[1].toUpperCase();
    const value = unquote(assignment[2]);
    if (!value || API_KEY_PATTERN.test(value)) continue;

    const namesSender = /FROM|SENDER/.test(name);
    if (!namesSender) continue;

    const sender = parseSender(value);
    if (sender.from) {
      parsed[CredentialsKeyEnum.From] ??= sender.from;
      if (sender.senderName) parsed[CredentialsKeyEnum.SenderName] ??= sender.senderName;
    } else if (/NAME/.test(name)) {
      // e.g. EMAIL_FROM_NAME=Acme, which wins over a name found inside the address variable.
      parsed[CredentialsKeyEnum.SenderName] = value;
    }
  }

  return parsed;
}
