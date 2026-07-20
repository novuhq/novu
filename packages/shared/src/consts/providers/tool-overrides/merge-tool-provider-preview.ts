import { getToolProviderPrimaryContentKey, type ToolContentOverrideProviderId } from './tool-provider-primary-content';

export type MergedToolPreview = {
  merged: Record<string, unknown>;
  defaultContentKey?: string;
};

export type AnnotatedPreviewLine = {
  json: string;
  isDefaultContentKey?: boolean;
};

export function mergeToolProviderPreview({
  body,
  providerId,
  override,
}: {
  body: string;
  providerId: ToolContentOverrideProviderId;
  override: Record<string, unknown> | undefined;
}): MergedToolPreview {
  const primaryKey = getToolProviderPrimaryContentKey(providerId);
  const merged: Record<string, unknown> = { ...(override ?? {}) };

  if (!merged[primaryKey]) {
    merged[primaryKey] = body;

    return { merged, defaultContentKey: primaryKey };
  }

  return { merged };
}

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
