/**
 * Generate a UUID using browser-native methods with fallback for non-HTTPS environments
 * 
 * The Web Crypto API's randomUUID() requires a secure context (HTTPS),
 * so we provide a fallback implementation for non-secure contexts.
 */
export function generateUUID(): string {
  // Try to use the native crypto.randomUUID if available (secure contexts)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Fallback for non-secure contexts (non-HTTPS environments)
  // This is a simplified implementation of UUID v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
