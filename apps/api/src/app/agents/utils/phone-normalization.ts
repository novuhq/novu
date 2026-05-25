export function getPhoneLookupCandidates(platformUserId: string): string[] {
  const trimmed = platformUserId.trim();

  if (!trimmed) {
    return [];
  }

  const withPlus = trimmed.startsWith('+') ? trimmed : `+${trimmed}`;
  const withoutPlus = trimmed.startsWith('+') ? trimmed.slice(1) : trimmed;

  return [...new Set([withPlus, withoutPlus])];
}

export function normalizePhoneForMeta(value: string): string {
  const trimmed = value.trim();

  return trimmed.startsWith('+') ? trimmed.slice(1) : trimmed;
}
