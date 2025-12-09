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
 * Recursively repairs JSON-like strings within an object by converting invalid JSON
 * (e.g., single quotes) to valid JSON (double quotes).
 * Only repairs strings that look like complete JSON structures (have both opening and closing brackets).
 * This handles cases where Liquid template variables output JavaScript object notation
 * instead of valid JSON (e.g., single quotes instead of double quotes).
 *
 * @param obj - The object that may contain string values with invalid JSON
 * @returns The object with JSON-like strings validated/repaired
 */
function repairJsonStringsInObject(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => {
      if (typeof value === 'string') {
        return [key, looksLikeJson(value) ? repairJsonString(value) : value];
      }
      // Recursively handle nested objects
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        return [key, repairJsonStringsInObject(value as Record<string, unknown>)];
      }
      return [key, value];
    })
  );
}

/**
 * Normalizes control data by repairing JSON strings within the `data` field.
 * This is specifically designed for step controls where the `data` field may contain
 * string values with invalid JSON (e.g., from Liquid template variables).
 *
 * @param controls - The control data object that may contain a `data` field with invalid JSON strings
 * @returns The normalized control data with JSON strings in the `data` field repaired
 */
export function normalizeControlData(controls: Record<string, unknown>): Record<string, unknown> {
  if (!controls?.data || typeof controls.data !== 'object' || Array.isArray(controls.data)) {
    return controls;
  }

  return {
    ...controls,
    data: repairJsonStringsInObject(controls.data as Record<string, unknown>),
  };
}
