import { getAtPath, setAtPath } from './path';
import { getProviderOverrideConfig, getProviderPrimaryContentKey } from './provider-override-registry';

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
  const config = getProviderOverrideConfig(providerId);
  const merged: Record<string, unknown> = { ...(override ?? {}) };
  const seed = config?.seedWhenAbsent;

  // Array-shaped content (LINE `messages`) — seed from the body only when the override omits
  // that key as an array, matching the send path that skips the default text message.
  if (seed) {
    if (Array.isArray(merged[seed.key])) {
      return { merged };
    }

    return {
      merged: {
        ...merged,
        [seed.key]: seed.buildDefault(body),
      },
      defaultContentKey: seed.defaultContentKey,
    };
  }

  const primaryKey = getProviderPrimaryContentKey(providerId);

  if (!primaryKey) {
    return { merged };
  }

  if (!getAtPath(merged, primaryKey)) {
    return { merged: setAtPath(merged, primaryKey, body), defaultContentKey: primaryKey };
  }

  return { merged };
}

/** @deprecated Renamed to `MergedProviderPreview`. */
export type MergedToolPreview = MergedProviderPreview;

/** @deprecated Renamed to `mergeProviderPreview`. */
export const mergeToolProviderPreview = mergeProviderPreview;
