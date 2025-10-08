/**
 * Simple context variable validation
 * Valid patterns:
 * - context.<type>.id (no nesting allowed after id)
 * - context.<type>.data (nesting allowed: context.<type>.data.*)
 */
export function isValidContextVariable(variableName: string): boolean {
  if (!variableName.startsWith('context.')) return false;

  const parts = variableName.split('.');
  if (parts.length < 3) return false;

  const [, , property] = parts;

  // context.<type>.id - no nesting allowed
  if (property === 'id') {
    return parts.length === 3; // Must be exactly context.<type>.id
  }

  // context.<type>.data.* - nesting allowed
  if (property === 'data') {
    return true; // Can be context.<type>.data or context.<type>.data.anything
  }

  return false;
}
