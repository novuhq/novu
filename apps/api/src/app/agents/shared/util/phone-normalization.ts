export function getPhoneLookupCandidates(platformUserId: string): string[] {
  const digits = normalizePhoneForMeta(platformUserId);

  if (!digits) {
    return [];
  }

  return [...new Set([`+${digits}`, digits])];
}

/** Digits only (no `+`, spaces, or punctuation) for Meta / $in phone lookups. */
export function normalizePhoneForMeta(value: string): string {
  const trimmed = value.trim();
  const withoutPlus = trimmed.startsWith('+') ? trimmed.slice(1) : trimmed;

  return withoutPlus.replace(/\D/g, '');
}

/**
 * Canonical E.164 for WhatsApp subscriber identity: `+` + digits only.
 * Digits-only inbound (Meta style) and common formatting (spaces, dashes) are
 * accepted. Returns null when empty or not a plausible E.164 number (1–15
 * digits, leading digit 1–9).
 */
export function toCanonicalE164Phone(platformUserId: string): string | null {
  const digits = normalizePhoneForMeta(platformUserId);

  if (!digits || !/^[1-9]\d{0,14}$/.test(digits)) {
    return null;
  }

  return `+${digits}`;
}
