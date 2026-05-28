const SLUG_SUFFIX_LENGTH = 6;
const FALLBACK_NAME = 'My Org';

export function buildConnectOrganizationName(firstName?: string | null): string {
  const trimmed = firstName?.trim();

  if (!trimmed) {
    return FALLBACK_NAME;
  }

  return `${trimmed}'s Org`;
}

export function buildConnectOrganizationSlug(baseName: string, suffix: string = randomSlugSuffix()): string {
  const normalizedBase = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const base = normalizedBase || 'org';

  return `${base}-${suffix}`;
}

export function randomSlugSuffix(length: number = SLUG_SUFFIX_LENGTH): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);

    return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
  }

  let result = '';
  for (let i = 0; i < length; i += 1) {
    result += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return result;
}
