/**
 * Utility functions for normalizing API responses that may have inconsistent shapes
 */

/**
 * Extract a list of items from various possible API envelope shapes.
 * Handles cases where the API returns:
 * - Direct array: [...]
 * - Single data wrapper: { data: [...] }
 * - Nested data wrapper: { data: { data: [...] } }
 *
 * @param body - The raw API response body
 * @returns An array of items, or empty array if no valid array structure found
 */
export function extractApiItems(body: unknown): unknown[] {
  type ApiEnvelope = unknown[] | { data: unknown[] } | { data: { data: unknown[] } };

  function hasDataArray(value: unknown): value is { data: unknown[] } {
    return typeof value === 'object' && value !== null && Array.isArray((value as { data?: unknown }).data);
  }

  function hasNestedDataArray(value: unknown): value is { data: { data: unknown[] } } {
    if (typeof value !== 'object' || value === null) return false;
    const inner = (value as { data?: unknown }).data as unknown;
    return typeof inner === 'object' && inner !== null && Array.isArray((inner as { data?: unknown[] }).data);
  }

  const envelope = body as ApiEnvelope;

  if (Array.isArray(envelope)) return envelope;
  if (hasDataArray(envelope)) return envelope.data;
  if (hasNestedDataArray(envelope)) return envelope.data.data;

  return [];
}
