export type AnnotatedPreviewLine = {
  json: string;
  isDefaultContentKey?: boolean;
};

/**
 * Pretty-prints a merged tool override preview and marks the top-level line
 * whose value was filled from the step's default content.
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

  const topLevelKeyPrefix = `  ${JSON.stringify(defaultContentKey)}:`;
  let hasMarkedDefaultContentKey = false;

  return jsonLines.map((json) => {
    if (!hasMarkedDefaultContentKey && json.startsWith(topLevelKeyPrefix)) {
      hasMarkedDefaultContentKey = true;

      return { json, isDefaultContentKey: true };
    }

    return { json };
  });
}
