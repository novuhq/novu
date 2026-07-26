import { getProviderPrimaryContentKey } from './provider-override-registry';

export type MergedProviderPreview = {
  merged: Record<string, unknown>;
  defaultContentKey?: string;
};

export function mergeProviderPreview({
  body,
  providerId,
  override,
}: {
  body: string;
  providerId: string;
  override: Record<string, unknown> | undefined;
}): MergedProviderPreview {
  const primaryKey = getProviderPrimaryContentKey(providerId);
  const merged: Record<string, unknown> = { ...(override ?? {}) };

  if (!primaryKey) {
    return { merged };
  }

  if (!merged[primaryKey]) {
    merged[primaryKey] = body;

    return { merged, defaultContentKey: primaryKey };
  }

  return { merged };
}

/** @deprecated Renamed to `MergedProviderPreview`. */
export type MergedToolPreview = MergedProviderPreview;

/** @deprecated Renamed to `mergeProviderPreview`. */
export const mergeToolProviderPreview = mergeProviderPreview;
