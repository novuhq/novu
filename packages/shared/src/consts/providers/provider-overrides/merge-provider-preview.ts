import { getProviderPrimaryContentKey } from './provider-override-registry';

export type MergedProviderPreview = {
  merged: Record<string, unknown>;
  defaultContentKey?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Reads a dotted path (`text.body`) from an override object. */
function getAtPath(target: Record<string, unknown>, path: string): unknown {
  const segments = path.split('.');
  let current: unknown = target;

  for (const segment of segments) {
    if (!isRecord(current) || !(segment in current)) {
      return undefined;
    }

    current = current[segment];
  }

  return current;
}

/**
 * Sets a dotted path on a shallow-cloned object tree so nested siblings of the filled
 * key (e.g. `text.preview_url` beside `text.body`) are preserved.
 */
function setAtPath(target: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const segments = path.split('.');
  const result: Record<string, unknown> = { ...target };
  let current: Record<string, unknown> = result;

  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index];
    if (segment === undefined) {
      continue;
    }

    const next = current[segment];

    if (isRecord(next)) {
      current[segment] = { ...next };
    } else {
      current[segment] = {};
    }

    current = current[segment] as Record<string, unknown>;
  }

  const leaf = segments[segments.length - 1];
  if (leaf !== undefined) {
    current[leaf] = value;
  }

  return result;
}

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

  if (!getAtPath(merged, primaryKey)) {
    return { merged: setAtPath(merged, primaryKey, body), defaultContentKey: primaryKey };
  }

  return { merged };
}

/** @deprecated Renamed to `MergedProviderPreview`. */
export type MergedToolPreview = MergedProviderPreview;

/** @deprecated Renamed to `mergeProviderPreview`. */
export const mergeToolProviderPreview = mergeProviderPreview;
