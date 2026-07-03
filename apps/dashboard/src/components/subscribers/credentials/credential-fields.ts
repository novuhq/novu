export type CredentialField = {
  key: string;
  label: string;
  value: string;
  /** Optional fields may be left blank on save (e.g. a webhook's routing channel). */
  optional?: boolean;
};

/**
 * Shared layout classes so the read-only value box and the editable input occupy the exact
 * same space (matching the `Input size="2xs"` metrics), preventing any layout shift on toggle.
 */
export const CREDENTIAL_CARD_CLASS = 'bg-bg-white flex flex-col gap-2 rounded-md p-1.5 shadow-xs';
export const CREDENTIAL_FIELD_LABEL_CLASS = 'text-2xs text-text-soft px-0.5';
export const CREDENTIAL_FIELD_BOX_CLASS =
  'flex h-7 items-center rounded-lg px-2 text-paragraph-xs font-mono text-text-sub';

/** Human-readable labels for the credential payload keys used by chat/push credentials. */
const CREDENTIAL_FIELD_LABELS: Record<string, string> = {
  url: 'Webhook URL',
  channel: 'Channel',
  channelId: 'Channel ID',
  userId: 'User ID',
  teamId: 'Team ID',
  chatId: 'Chat ID',
  phoneNumber: 'Phone number',
  phone: 'Phone number',
  deviceToken: 'Device token',
};

/** Payload keys that are not required when saving. */
const OPTIONAL_FIELD_KEYS = new Set<string>(['channel']);

/** Falls back to a humanized version of the key when no explicit label exists. */
export function getFieldLabel(key: string): string {
  if (CREDENTIAL_FIELD_LABELS[key]) {
    return CREDENTIAL_FIELD_LABELS[key];
  }

  const spaced = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim();

  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Builds the ordered, labeled fields for a credential payload (used by display and edit). */
export function payloadToFields(payload: Record<string, unknown>): CredentialField[] {
  return Object.keys(payload).map((key) => ({
    key,
    label: getFieldLabel(key),
    value: typeof payload[key] === 'string' ? (payload[key] as string) : String(payload[key] ?? ''),
    optional: OPTIONAL_FIELD_KEYS.has(key),
  }));
}
