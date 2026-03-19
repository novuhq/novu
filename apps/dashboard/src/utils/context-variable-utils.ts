/**
 * Default context representation using an empty string.
 *
 * Why [''] instead of []?
 * The Speakeasy SDK strips empty arrays from query parameters entirely.
 * When we use contextKeys=[], the SDK omits the parameter completely,
 * making it impossible to distinguish between:
 * - "no filter" (contextKeys not sent)
 * - "filter for records with no context" (contextKeys=)
 *
 * By using contextKeys=[''], the SDK sends contextKeys= (empty string),
 * which the backend can interpret as "filter for records with no context".
 */
export const DEFAULT_CONTEXT_VALUE = '';
export const DEFAULT_CONTEXT_LABEL = 'Default context';

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

/**
 * Converts an array of context keys to a context payload object
 * for use in subscriber preferences API calls.
 *
 * Note: We use [''] (array with empty string) as the "default context" representation
 * instead of [] (empty array) due to a Speakeasy SDK limitation that strips empty arrays
 * from query parameters entirely. This allows us to distinguish between "no context filter"
 * and "filter for records with no context" in API calls.
 *
 * @param contextKeys - Array of context keys in format "type:id" (e.g., ["tenant:acme", "project:alpha"])
 * @returns Context payload object or undefined if no context should be set
 *
 * @example
 * convertContextKeysToPayload(['tenant:acme', 'project:alpha'])
 * // Returns: { tenant: 'acme', project: 'alpha' }
 *
 * convertContextKeysToPayload([''])
 * // Returns: undefined (default context, no context payload sent to API)
 *
 * convertContextKeysToPayload([])
 * // Returns: undefined (no context)
 */
export function convertContextKeysToPayload(contextKeys?: string[]): Record<string, string> | undefined {
  if (!contextKeys?.length || (contextKeys.length === 1 && contextKeys[0] === '')) {
    return undefined;
  }

  const context: Record<string, string> = {};
  for (const key of contextKeys) {
    const parts = key.split(':');
    const type = parts[0];
    const id = parts.slice(1).join(':');
    if (type && id) {
      context[type] = id;
    }
  }

  return context;
}
