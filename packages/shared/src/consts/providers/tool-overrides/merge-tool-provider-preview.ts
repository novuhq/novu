import { ToolProviderIdEnum } from '../../../types';

type ToolContentOverrideProviderId = ToolProviderIdEnum.PagerDuty | ToolProviderIdEnum.Opsgenie;

export type MergedToolPreview = {
  merged: Record<string, unknown>;
  /** set when the primary content key was filled from the default message body */
  defaultContentKey?: string;
};

export type AnnotatedPreviewLine = {
  json: string; // one display line of the pretty JSON (no chip text)
  isDefaultContentKey?: boolean; // true on the FIRST line of the property filled from default content
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
  const primaryKey = primaryContentKeyFor(providerId);
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

/** Mirrors `TOOL_PROVIDER_PRIMARY_CONTENT_KEY` / `getToolProviderPrimaryContentKey` without a barrel import cycle. */
function primaryContentKeyFor(providerId: ToolContentOverrideProviderId): string {
  switch (providerId) {
    case ToolProviderIdEnum.PagerDuty:
      return 'summary';
    case ToolProviderIdEnum.Opsgenie:
      return 'message';
    default: {
      const exhaustiveCheck: never = providerId;

      return exhaustiveCheck;
    }
  }
}
