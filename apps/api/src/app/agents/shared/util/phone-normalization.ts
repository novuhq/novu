export function getPhoneLookupCandidates(platformUserId: string): string[] {
  const trimmed = platformUserId.trim();

  if (!trimmed) {
    return [];
  }

  const withPlus = trimmed.startsWith('+') ? trimmed : `+${trimmed}`;
  const withoutPlus = normalizePhoneForMeta(trimmed);

  return [...new Set([withPlus, withoutPlus])];
}

export function normalizePhoneForMeta(value: string): string {
  const trimmed = value.trim();

  return trimmed.startsWith('+') ? trimmed.slice(1) : trimmed;
}

/**
 * Canonical E.164 for WhatsApp subscriber identity: `+` + digits only.
 * Digits-only inbound (Meta style) is accepted and prefixed. Returns null when
 * empty or not a plausible E.164 number (1–15 digits, leading digit 1–9).
 */
export function toCanonicalE164Phone(platformUserId: string): string | null {
  const trimmed = platformUserId.trim();

  if (!trimmed) {
    return null;
  }

  const digits = trimmed.startsWith('+') ? trimmed.slice(1) : trimmed;
  if (!/^[1-9]\d{0,14}$/.test(digits)) {
    return null;
  }

  return `+${digits}`;
}
