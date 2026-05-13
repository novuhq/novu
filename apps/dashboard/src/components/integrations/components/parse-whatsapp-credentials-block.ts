import { CredentialsKeyEnum } from '@novu/shared';

export type WhatsAppCredentialField =
  | CredentialsKeyEnum.ApiToken
  | CredentialsKeyEnum.phoneNumberIdentification
  | CredentialsKeyEnum.businessAccountId
  | CredentialsKeyEnum.SecretKey;

type WhatsAppFieldShape = {
  key: WhatsAppCredentialField;
  label: string;
  /** Validates the parsed value shape. Used for inline confidence hints. */
  matches?: RegExp;
};

const WHATSAPP_FIELDS: WhatsAppFieldShape[] = [
  {
    key: CredentialsKeyEnum.ApiToken,
    label: 'Access Token',
    matches: /^EAA[A-Za-z0-9]+$/,
  },
  {
    key: CredentialsKeyEnum.phoneNumberIdentification,
    label: 'Phone Number ID',
    matches: /^\d{6,}$/,
  },
  {
    key: CredentialsKeyEnum.businessAccountId,
    label: 'WhatsApp Business Account ID',
    matches: /^\d{6,}$/,
  },
  {
    key: CredentialsKeyEnum.SecretKey,
    label: 'App Secret',
    matches: /^[a-f0-9]{32,}$/i,
  },
];

/**
 * The "Access Token" label appears multiple times on Meta's API Setup page
 * (e.g. heading, aria label `Access Token Copyable Input`, sub-label
 * `Access Token String`) before the actual value. Anchoring on the EAA prefix
 * — which is unique to Meta-issued tokens — is far more reliable than walking
 * lines below the label.
 */
const ACCESS_TOKEN_REGEX = /\b(EAA[A-Za-z0-9]{50,})\b/;
const PHONE_NUMBER_ID_REGEX = /Phone\s+number\s+ID\s*[:=]\s*(\d{6,})/i;
const WABA_ID_REGEX = /WhatsApp\s+Business\s+Account\s+ID\s*[:=]\s*(\d{6,})/i;
/**
 * Meta shows the App Secret on a different page (App settings > Basic). It is
 * usually a 32-char hex string, sometimes masked behind a "Show" toggle. We
 * still try to extract it so a user who pastes that page later also benefits.
 */
const APP_SECRET_REGEX = /App\s+secret\s*[:=]\s*([a-f0-9]{32,})/i;
const MASKED_APP_SECRET_REGEX = /App\s+secret\s*[:=]?\s*([\u2022\u25CF\u00B7\u2219\u25E6\u2218\u26AB\u26AA*]{6,})/i;

export type ParsedWhatsAppCredentials = {
  values: Partial<Record<WhatsAppCredentialField, string>>;
  matched: WhatsAppCredentialField[];
  invalid: WhatsAppCredentialField[];
  /** Labels we recognized but whose value was masked behind dots. */
  masked: WhatsAppCredentialField[];
};

/**
 * Parse the WhatsApp Business credentials freeform text copied from Meta's
 * "API Setup" page (or "App settings > Basic" for the App Secret).
 *
 * Unlike Slack's neatly stacked App Credentials block, Meta's pages mix
 * tutorial copy, aria-only labels, and curl examples around the actual values.
 * Label-anchored regex with shape constraints proves more reliable than a
 * line-by-line walk for this layout.
 */
export function parseWhatsAppCredentialsBlock(input: string): ParsedWhatsAppCredentials {
  const result: ParsedWhatsAppCredentials = {
    values: {},
    matched: [],
    invalid: [],
    masked: [],
  };

  if (!input.trim()) {
    return result;
  }

  const apiTokenMatch = input.match(ACCESS_TOKEN_REGEX);
  if (apiTokenMatch?.[1]) {
    recordValue(result, CredentialsKeyEnum.ApiToken, apiTokenMatch[1]);
  }

  const phoneIdMatch = input.match(PHONE_NUMBER_ID_REGEX);
  if (phoneIdMatch?.[1]) {
    recordValue(result, CredentialsKeyEnum.phoneNumberIdentification, phoneIdMatch[1]);
  }

  const wabaIdMatch = input.match(WABA_ID_REGEX);
  if (wabaIdMatch?.[1]) {
    recordValue(result, CredentialsKeyEnum.businessAccountId, wabaIdMatch[1]);
  }

  const appSecretMatch = input.match(APP_SECRET_REGEX);
  if (appSecretMatch?.[1]) {
    recordValue(result, CredentialsKeyEnum.SecretKey, appSecretMatch[1]);
  } else if (MASKED_APP_SECRET_REGEX.test(input)) {
    result.masked.push(CredentialsKeyEnum.SecretKey);
  }

  return result;
}

export function getWhatsAppFieldDisplayName(key: WhatsAppCredentialField): string {
  return WHATSAPP_FIELDS.find((field) => field.key === key)?.label ?? key;
}

/** Heuristic: pasted text likely is a WhatsApp credentials block when at least 2 fields parse cleanly. */
export function isLikelyWhatsAppCredentialsBlock(input: string): boolean {
  if (input.length < 20) {
    return false;
  }

  const parsed = parseWhatsAppCredentialsBlock(input);

  return parsed.matched.length + parsed.masked.length >= 2;
}

function recordValue(result: ParsedWhatsAppCredentials, key: WhatsAppCredentialField, rawValue: string): void {
  if (result.values[key] !== undefined) {
    return;
  }

  const value = rawValue.trim();
  if (value.length === 0) {
    return;
  }

  result.values[key] = value;
  result.matched.push(key);

  const shape = WHATSAPP_FIELDS.find((field) => field.key === key);
  if (shape?.matches && !shape.matches.test(value)) {
    result.invalid.push(key);
  }
}
