/**
 * URL-safe slug for workflow IDs, step IDs, agent identifiers, etc.
 * Letters and numbers; separators `-`, `_`, `.` only between segments (no spaces).
 */
export const SLUG_IDENTIFIER_REGEX = /^[a-zA-Z0-9]+(?:[-_.][a-zA-Z0-9]+)*$/;

export function slugIdentifierFormatMessage(fieldName: string): string {
  return `${fieldName} must be a valid slug format (letters, numbers, hyphens, dot and underscores only)`;
}
