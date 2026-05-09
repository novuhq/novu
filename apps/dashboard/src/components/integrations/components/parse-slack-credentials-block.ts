import { CredentialsKeyEnum } from '@novu/shared';

export type SlackCredentialField =
  | CredentialsKeyEnum.ApplicationId
  | CredentialsKeyEnum.ClientId
  | CredentialsKeyEnum.SecretKey
  | CredentialsKeyEnum.SigningSecret;

type SlackFieldShape = {
  key: SlackCredentialField;
  label: string;
  /** Aliases Slack has used historically; matched case-insensitively. */
  aliases?: string[];
  /** Validates the parsed value shape. Used for inline confidence hints. */
  matches?: RegExp;
};

const SLACK_FIELDS: SlackFieldShape[] = [
  {
    key: CredentialsKeyEnum.ApplicationId,
    label: 'App ID',
    matches: /^A[A-Z0-9]{8,}$/,
  },
  {
    key: CredentialsKeyEnum.ClientId,
    label: 'Client ID',
    matches: /^\d+\.\d+$/,
  },
  {
    key: CredentialsKeyEnum.SecretKey,
    label: 'Client Secret',
    matches: /^[a-f0-9]{32,}$/i,
  },
  {
    key: CredentialsKeyEnum.SigningSecret,
    label: 'Signing Secret',
    matches: /^[a-f0-9]{32,}$/i,
  },
];

const NOISE_LINES = new Set([
  'app credentials',
  'date of app creation',
  "you'll need to send this secret along with your client id when making your oauth.v2.access request.",
  'slack signs the requests we send you using this secret. confirm that each request comes from slack by verifying its unique signature.',
]);

/**
 * Slack masks secrets in its UI as a row of bullet glyphs. We need to recognize
 * the most common ones so the parser can flag them instead of pushing the dots
 * into the form. Covers •, ●, ·, ∙, ◦, ∘, ⚫, ⚪ and `*`.
 */
const MASK_CHAR_REGEX = /^[\u2022\u25CF\u00B7\u2219\u25E6\u2218\u26AB\u26AA*]+$/;

function isMaskedValue(value: string): boolean {
  const stripped = value.replace(/\s+/g, '');
  if (stripped.length < 3) {
    return false;
  }

  return MASK_CHAR_REGEX.test(stripped);
}

export type ParsedSlackCredentials = {
  values: Partial<Record<SlackCredentialField, string>>;
  matched: SlackCredentialField[];
  invalid: SlackCredentialField[];
  /** Labels we recognized but whose value was masked (e.g. `••••••••`). */
  masked: SlackCredentialField[];
  unknownLines: string[];
};

/**
 * Parse the "App Credentials" block copied from a Slack app settings page.
 *
 * The block is a freeform mix of section headers and label/value pairs. Slack's
 * format is stable enough to parse with a per-field label regex, but tolerant
 * to label aliases, mid-line copy artefacts, and the surrounding marketing copy.
 */
export function parseSlackCredentialsBlock(input: string): ParsedSlackCredentials {
  const result: ParsedSlackCredentials = {
    values: {},
    matched: [],
    invalid: [],
    masked: [],
    unknownLines: [],
  };

  if (!input.trim()) {
    return result;
  }

  const lines = input
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (NOISE_LINES.has(line.toLowerCase())) {
      continue;
    }

    let matchedField: SlackFieldShape | undefined;
    let value: string | undefined;

    for (const field of SLACK_FIELDS) {
      const labelMatch = matchInlineLabel(line, field);
      if (labelMatch !== null) {
        matchedField = field;
        value = labelMatch;
        break;
      }

      if (matchesLabel(line, field)) {
        matchedField = field;
        const consumed = consumeNextValue(lines, index);
        value = consumed.value;
        if (consumed.consumedIndex !== undefined) {
          index = consumed.consumedIndex;
        }
        break;
      }
    }

    if (!matchedField) {
      if (!isLikelyNoise(line)) {
        result.unknownLines.push(line);
      }
      continue;
    }

    if (value === undefined || value.length === 0) {
      continue;
    }

    if (
      result.values[matchedField.key] !== undefined ||
      result.masked.includes(matchedField.key)
    ) {
      // Slack pages don't repeat fields; if they do, prefer the first match
      // and skip duplicates so the user's existing value isn't clobbered twice.
      continue;
    }

    if (isMaskedValue(value)) {
      // The user copied while the secret was still hidden. Don't push the
      // bullets into the form — surface the field so we can prompt them to
      // unmask it in Slack and paste again.
      result.masked.push(matchedField.key);
      continue;
    }

    result.values[matchedField.key] = value;
    result.matched.push(matchedField.key);

    if (matchedField.matches && !matchedField.matches.test(value)) {
      result.invalid.push(matchedField.key);
    }
  }

  return result;
}

export function getSlackFieldDisplayName(key: SlackCredentialField): string {
  return SLACK_FIELDS.find((field) => field.key === key)?.label ?? key;
}

/** Heuristic: pasted text likely is a Slack credentials block when at least 2 fields parse cleanly. */
export function isLikelySlackCredentialsBlock(input: string): boolean {
  if (!input.includes('\n')) {
    return false;
  }

  const parsed = parseSlackCredentialsBlock(input);

  // Masked values still count: the user clearly copied a Slack credentials
  // block, they just forgot to unmask the secrets first.
  return parsed.matched.length + parsed.masked.length >= 2;
}

function matchInlineLabel(line: string, field: SlackFieldShape): string | null {
  const labels = [field.label, ...(field.aliases ?? [])];

  for (const label of labels) {
    const inlineRegex = new RegExp(`^${escapeRegExp(label)}\\s*[:=]\\s*(.+)$`, 'i');
    const match = line.match(inlineRegex);
    if (match) {
      return cleanValue(match[1]);
    }
  }

  return null;
}

function matchesLabel(line: string, field: SlackFieldShape): boolean {
  const labels = [field.label, ...(field.aliases ?? [])];
  const normalized = line.replace(/:\s*$/, '').toLowerCase();

  return labels.some((label) => normalized === label.replace(/:\s*$/, '').toLowerCase());
}

function consumeNextValue(
  lines: string[],
  currentIndex: number
): { value: string | undefined; consumedIndex?: number } {
  for (let lookahead = currentIndex + 1; lookahead < lines.length; lookahead += 1) {
    const candidate = lines[lookahead];

    if (NOISE_LINES.has(candidate.toLowerCase()) || isLikelyNoise(candidate)) {
      continue;
    }

    if (looksLikeFieldLabel(candidate)) {
      return { value: undefined };
    }

    return { value: cleanValue(candidate), consumedIndex: lookahead };
  }

  return { value: undefined };
}

function looksLikeFieldLabel(line: string): boolean {
  return SLACK_FIELDS.some((field) => matchesLabel(line, field) || matchInlineLabel(line, field) !== null);
}

function isLikelyNoise(line: string): boolean {
  if (line.length > 200) return true;
  if (/^[a-z][a-z\s]+:$/i.test(line)) return true;

  return false;
}

function cleanValue(raw: string): string {
  return raw.replace(/^["']|["']$/g, '').trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
