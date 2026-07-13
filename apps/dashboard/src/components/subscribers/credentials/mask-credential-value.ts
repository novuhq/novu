const VISIBLE_PREFIX = 4;
const MIN_MASK_LENGTH = 4;

/** Partially masks a credential value, revealing only a short prefix. */
export function maskCredentialValue(value: string): string {
  if (!value) {
    return '';
  }

  if (value.length <= VISIBLE_PREFIX) {
    return '•'.repeat(value.length);
  }

  const maskLength = Math.max(value.length - VISIBLE_PREFIX, MIN_MASK_LENGTH);

  return `${value.slice(0, VISIBLE_PREFIX)}${'•'.repeat(maskLength)}`;
}
