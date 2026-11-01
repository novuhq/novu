/** E.164: a leading plus and 8 to 15 digits, not starting with 0. */
const E164 = /^\+[1-9]\d{7,14}$/;

/**
 * Strips spaces, dashes, and parentheses. Returns null when what remains is
 * not E.164, so a local number without a country code is refused.
 */
export function normalizeE164(raw: string): string | null {
  const compact = raw.trim().replace(/[\s()-]/g, '');
  if (!E164.test(compact)) {
    return null;
  }

  return compact;
}

/** `+1555121212` → `+***1212`. Status surfaces never echo the full number. */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const tail = digits.slice(-4);
  if (tail.length < 4) {
    return '***';
  }

  return `+***${tail}`;
}
