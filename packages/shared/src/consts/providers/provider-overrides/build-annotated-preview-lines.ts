export type AnnotatedPreviewLine = {
  json: string;
  isDefaultContentKey?: boolean;
};

const PROPERTY_KEY_PATTERN = /^("(?:\\.|[^"\\])*")\s*:/;

function parsePropertyKey(trimmedLine: string): string | undefined {
  const match = trimmedLine.match(PROPERTY_KEY_PATTERN);
  if (!match) {
    return undefined;
  }

  const capturedKey = match[1];
  if (capturedKey === undefined) {
    return undefined;
  }

  try {
    return JSON.parse(capturedKey) as string;
  } catch {
    return undefined;
  }
}

/**
 * Pretty-prints a merged provider override preview and marks the line whose value was
 * filled from the step's default content. `defaultContentKey` may be a dotted path
 * (`text.body`) for providers that nest their message body.
 */
export function buildAnnotatedPreviewLines(
  merged: Record<string, unknown>,
  defaultContentKey?: string
): AnnotatedPreviewLine[] {
  const prettyJson = Object.keys(merged).length === 0 ? '{\n}' : JSON.stringify(merged, null, 2);
  const jsonLines = prettyJson.split('\n');

  if (!defaultContentKey) {
    return jsonLines.map((json) => ({ json }));
  }

  const segments = defaultContentKey.split('.');
  let segmentIndex = 0;
  let hasMarkedDefaultContentKey = false;

  return jsonLines.map((json) => {
    if (hasMarkedDefaultContentKey) {
      return { json };
    }

    const trimmed = json.trimStart();
    const key = parsePropertyKey(trimmed);
    if (key === undefined) {
      return { json };
    }

    const indentLevel = (json.length - trimmed.length) / 2;
    const expectedIndent = segmentIndex + 1;

    // Left the matched parent object without finding the rest of the path.
    if (indentLevel < expectedIndent) {
      segmentIndex = 0;
    }

    if (indentLevel === segmentIndex + 1 && key === segments[segmentIndex]) {
      if (segmentIndex === segments.length - 1) {
        hasMarkedDefaultContentKey = true;

        return { json, isDefaultContentKey: true };
      }

      segmentIndex += 1;
    }

    return { json };
  });
}
