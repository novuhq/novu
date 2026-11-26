import { CredentialsKeyEnum } from '@novu/shared';

export type AwsCredentialField = CredentialsKeyEnum.ApiKey | CredentialsKeyEnum.SecretKey | CredentialsKeyEnum.Region;

export type ParsedAwsCredentials = Partial<Record<AwsCredentialField, string>>;

/** A long-term IAM user access key ID: `AKIA` and 16 more capital letters and digits. */
const ACCESS_KEY_ID_PATTERN = /\bAKIA[A-Z0-9]{16}\b/;
/** Temporary keys start with `ASIA` and only work with a session token, which the integration doesn't take. */
const TEMPORARY_KEY_ID_PATTERN = /\bASIA[A-Z0-9]{16}\b/;
/** A secret access key: 40 characters of base64, standing on its own. */
const SECRET_KEY_PATTERN = /(?<![A-Za-z0-9/+=])[A-Za-z0-9/+]{40}(?![A-Za-z0-9/+=])/;
const REGION_PATTERN = /^[a-z]{2}(?:-gov|-iso[a-z]?)?-[a-z]+-\d$/;
/** `KEY=value` or `key = value`, with an optional `export` or PowerShell `$env:` in front. */
const ASSIGNMENT_PATTERN = /^(?:export\s+|set\s+|\$env:)?([A-Za-z_][A-Za-z0-9_ ]*?)\s*[=:]\s*(.*)$/;

export function isAwsAccessKeyId(value: string | undefined): boolean {
  return !!value && new RegExp(`^${ACCESS_KEY_ID_PATTERN.source}$`).test(value.trim());
}

export function hasTemporaryAwsKey(text: string): boolean {
  return TEMPORARY_KEY_ID_PATTERN.test(text) && !ACCESS_KEY_ID_PATTERN.test(text);
}

function unquote(value: string): string {
  return value
    .trim()
    .replace(/\s+#.*$/, '')
    .replace(/^["'`]|["'`];?$/g, '')
    .trim();
}

/** Splits one CSV row; AWS quotes no values in its key files, but a spreadsheet that re-saved one may. */
function splitCsvRow(row: string): string[] {
  return row.split(',').map((cell) => cell.trim().replace(/^"|"$/g, ''));
}

/**
 * The file AWS downloads when it creates an access key (`<user>_accessKeys.csv`): a header row naming the columns
 * and one row of values. Older files have more columns, so the two that matter are found by name.
 */
function parseAccessKeysCsv(lines: string[]): ParsedAwsCredentials {
  const headerIndex = lines.findIndex((line) => /access key id/i.test(line) && line.includes(','));
  if (headerIndex === -1 || headerIndex + 1 >= lines.length) return {};

  const header = splitCsvRow(lines[headerIndex]).map((cell) => cell.toLowerCase());
  const row = splitCsvRow(lines[headerIndex + 1]);
  const idColumn = header.indexOf('access key id');
  const secretColumn = header.indexOf('secret access key');
  const parsed: ParsedAwsCredentials = {};

  if (idColumn !== -1 && row[idColumn]) parsed[CredentialsKeyEnum.ApiKey] = row[idColumn];
  if (secretColumn !== -1 && row[secretColumn]) parsed[CredentialsKeyEnum.SecretKey] = row[secretColumn];

  return parsed;
}

/**
 * True when pasted text is more than a bare value: an access key ID next to other things, as in a key file, a
 * block of environment variables or a credentials file. A key on its own is left for the field it was pasted into.
 */
export function isLikelyAwsCredentialsBlock(text: string): boolean {
  const trimmed = text.trim();

  return ACCESS_KEY_ID_PATTERN.test(trimmed) && /[=:,\n]/.test(trimmed);
}

/**
 * Best-effort read of AWS credentials from the access key CSV, environment variables (`AWS_ACCESS_KEY_ID=…`), or a
 * credentials file (`aws_access_key_id = …`). The region comes along when the text names one.
 */
export function parseAwsCredentials(text: string): ParsedAwsCredentials {
  // A byte order mark starts files some spreadsheets save; commented-out lines often hold an old key.
  const lines = text
    .replace(/^﻿/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));

  const parsed = parseAccessKeysCsv(lines);

  for (const line of lines) {
    const assignment = line.match(ASSIGNMENT_PATTERN);
    if (!assignment) continue;

    const name = assignment[1].toLowerCase().replace(/[\s_]+/g, '');
    const value = unquote(assignment[2]);
    if (!value) continue;

    if (name.endsWith('accesskeyid')) parsed[CredentialsKeyEnum.ApiKey] ??= value;
    else if (name.endsWith('secretaccesskey') || name.endsWith('secretkey')) {
      parsed[CredentialsKeyEnum.SecretKey] ??= value;
    } else if (name.endsWith('region') && REGION_PATTERN.test(value)) parsed[CredentialsKeyEnum.Region] ??= value;
  }

  // Unlabelled text, such as the two values copied one under the other: found by their shape.
  const joined = lines.join('\n');
  parsed[CredentialsKeyEnum.ApiKey] ??= joined.match(ACCESS_KEY_ID_PATTERN)?.[0];
  parsed[CredentialsKeyEnum.SecretKey] ??= joined.match(SECRET_KEY_PATTERN)?.[0];

  for (const key of Object.keys(parsed) as AwsCredentialField[]) {
    if (parsed[key] === undefined) delete parsed[key];
  }

  return parsed;
}
