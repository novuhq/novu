import { jsonrepair } from 'jsonrepair';

/**
 * Checks if a string looks like a complete JSON structure (object or array).
 */
function looksLikeJson(value: string): boolean {
  const trimmed = value.trim();
  return (
    ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) &&
    trimmed.length > 2
  );
}

/**
 * Attempts to repair a JSON string. Returns the original string if repair fails.
 */
function repairJsonString(value: string): string {
  try {
    JSON.parse(value);
    return value; // Already valid JSON
  } catch {
    try {
      return jsonrepair(value);
    } catch {
      return value; // Can't repair, keep original
    }
  }
}

/**
 * Normalizes string values in control data by attempting to repair JSON.
 * Only repairs strings that look like complete JSON structures (have both opening and closing brackets).
 * This handles cases where Liquid template variables output JavaScript object notation
 * instead of valid JSON (e.g., single quotes instead of double quotes).
 *
 * @param data - The control data object that may contain string values with invalid JSON
 * @returns The normalized data object with all JSON-like strings validated/repaired
 */
export function normalizeControlData(data: Record<string, unknown>): Record<string, unknown> {
  if (!data) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => {
      if (typeof value === 'string') {
        return [key, looksLikeJson(value) ? repairJsonString(value) : value];
      }
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        return [key, normalizeControlData(value as Record<string, unknown>)];
      }
      return [key, value];
    })
  );
}
