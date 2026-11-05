/**
 * Last-line cap on a history tool output before it reaches the model. The Novu API caps stored output,
 * but older API versions and other history producers may not, and one large MCP result is enough to
 * exceed the provider's context window. Counted in UTF-16 code units, so output the API already capped
 * by bytes always fits.
 */
export const HISTORY_TOOL_OUTPUT_MAX_CHARS = 16_384;

const TRUNCATION_MARKER = `… [truncated: tool output exceeded ${HISTORY_TOOL_OUTPUT_MAX_CHARS} characters]`;

export function capHistoryToolOutput<T>(output: T): T | string {
  const serialized = typeof output === 'string' ? output : safeSerialize(output);
  if (serialized === undefined || serialized.length <= HISTORY_TOOL_OUTPUT_MAX_CHARS) {
    return output;
  }

  let kept = serialized.slice(0, HISTORY_TOOL_OUTPUT_MAX_CHARS - TRUNCATION_MARKER.length);
  if (/[\uD800-\uDBFF]$/.test(kept)) {
    kept = kept.slice(0, -1);
  }

  return `${kept}${TRUNCATION_MARKER}`;
}

function safeSerialize(value: unknown): string | undefined {
  try {
    return JSON.stringify(value);
  } catch {
    return undefined;
  }
}
