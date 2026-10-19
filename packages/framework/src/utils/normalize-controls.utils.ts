import { jsonrepair } from 'jsonrepair';

/**
 * Checks if a string looks like a complete JSON structure (object or array).
 */
export function looksLikeJson(value: string): boolean {
  const trimmed = value.trim();
  return (
    ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) &&
    trimmed.length > 2
  );
}

/**
 * Markers used to wrap pre-parsed JSON-string control values during Liquid compilation.
 * The pre-parse step replaces a control value like `'{"type":"doc",...}'` with the parsed object,
 * so Liquid renders against the object's leaf strings (single level of JSON escaping) instead of
 * the doubly-escaped string-inside-a-string. After Liquid renders and the outer string is parsed,
 * any value wrapped with these markers is JSON.stringified back to a string, restoring the
 * original control value shape.
 *
 * Without this round-trip, values rendered into a JSON-stringified control value (e.g. Maily
 * email bodies) end up with unescaped quotes when the rendered payload contains a `"` character,
 * because Liquid's default escape only handles one level of JSON encoding.
 */
export const JSON_STRING_WRAPPER_KEY = '__novuJsonString';

interface JsonStringWrapper {
  [JSON_STRING_WRAPPER_KEY]: true;
  value: unknown;
}

function isJsonStringWrapper(value: unknown): value is JsonStringWrapper {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    (value as JsonStringWrapper)[JSON_STRING_WRAPPER_KEY] === true
  );
}

/**
 * Recursively walks `controls` and, for every string that looks like a complete JSON object/array
 * and parses cleanly, replaces it with a wrapper object containing the parsed value. The wrapper
 * allows {@link restoreJsonStringControlValues} to reliably identify which values to re-stringify
 * after Liquid has been rendered, regardless of how deeply they were nested.
 *
 * @returns A new controls structure with JSON strings replaced by wrapper objects.
 */
export function expandJsonStringControlValues(controls: unknown): unknown {
  if (typeof controls === 'string') {
    if (!looksLikeJson(controls)) {
      return controls;
    }
    try {
      const parsed = JSON.parse(controls);

      return { [JSON_STRING_WRAPPER_KEY]: true, value: expandJsonStringControlValues(parsed) };
    } catch {
      return controls;
    }
  }

  if (Array.isArray(controls)) {
    return controls.map((item) => expandJsonStringControlValues(item));
  }

  if (controls && typeof controls === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(controls)) {
      out[key] = expandJsonStringControlValues(value);
    }

    return out;
  }

  return controls;
}

/**
 * Inverse of {@link expandJsonStringControlValues}. Recursively walks the rendered controls and
 * replaces any wrapper objects with the JSON.stringified form of their `value`, restoring the
 * original "string that contains JSON" shape.
 */
export function restoreJsonStringControlValues(controls: unknown): unknown {
  if (isJsonStringWrapper(controls)) {
    return JSON.stringify(restoreJsonStringControlValues(controls.value));
  }

  if (Array.isArray(controls)) {
    return controls.map((item) => restoreJsonStringControlValues(item));
  }

  if (controls && typeof controls === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(controls)) {
      out[key] = restoreJsonStringControlValues(value);
    }

    return out;
  }

  return controls;
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
