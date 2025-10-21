import { Context } from '../../types';

/**
 * Builds a compact, stable string key from context objects by extracting only type:id pairs.
 *
 * This avoids including large `data` payloads in:
 * - React dependency arrays (useMemo)
 * - Web Locks API channel names (prevents duplicate subscriptions)
 *
 * @example
 * buildContextKey({ tenant: { id: "inbox-1", data: {...} } }) // "tenant:inbox-1"
 * buildContextKey({ tenant: "inbox-1" }) // "tenant:inbox-1"
 * buildContextKey(undefined) // ""
 */
export function buildContextKey(context: Context | undefined): string {
  if (!context) {
    return '';
  }

  const keys: string[] = [];
  for (const [type, value] of Object.entries(context)) {
    if (value) {
      const id = typeof value === 'string' ? value : value.id;
      keys.push(`${type}:${id}`);
    }
  }

  // Sort for consistency (order shouldn't matter)
  return keys.sort().join(',');
}
