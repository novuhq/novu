import { getToolProviderPrimaryContentKey, type ToolContentOverrideProviderId } from './tool-provider-primary-content';

export type MergedToolPreview = {
  merged: Record<string, unknown>;
  defaultContentKey?: string;
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
