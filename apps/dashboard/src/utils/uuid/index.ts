/**
 * Generate a UUID using browser-native methods with fallback for non-HTTPS environments
 *
 * The Web Crypto API's randomUUID() requires a secure context (HTTPS),
 * so we provide a fallback implementation for non-secure contexts.
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  /* cspell:disable-next-line */
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
