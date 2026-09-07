const EMAIL_LOOKUP_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmailForLookup(platformUserId: string): string {
  return platformUserId.trim().toLowerCase();
}

export function isValidEmailForLookup(email: string): boolean {
  return EMAIL_LOOKUP_REGEX.test(email);
}
