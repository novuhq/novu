import {
  type AnnotatedPreviewLine,
  buildAnnotatedPreviewLines,
  getProviderPrimaryContentKey,
  isRecord,
  mergeProviderPreview,
} from '@novu/shared';
import { useMemo } from 'react';
import { hasOwn, type OverrideContentSource, type OverrideValues } from './content-source';

export const PREVIEW_PANEL_CLASS =
  'bg-neutral-alpha-50 text-foreground-950 min-h-16 overflow-auto rounded-md border border-neutral-100 p-2 font-mono text-[11px] leading-4 [scrollbar-gutter:stable]';

export type OverridePreviewLine = AnnotatedPreviewLine & {
  /** Set on lines an integration override takes unchanged from its provider override. */
  isInherited?: boolean;
};

export type AnnotatedOverridePreview = {
  annotatedLines: OverridePreviewLine[];
  defaultContentKey?: string;
  hasOverride: boolean;
  hasInheritedKeys: boolean;
};

type OverrideMap = Partial<Record<string, Record<string, unknown>>> | null | undefined;

/**
 * Form state is the source of truth for whether an override exists. Preview may lag
 * (`keepPreviousData`, payload hydration) and briefly omit or invent keys — never let that
 * flip the footer/JSON between "no override" and "merged".
 *
 * `key` is a providerId in the provider map, or an integration identifier in one provider's
 * integration map.
 */
export function resolveOverrideForPreview({
  key,
  formOverrides,
  previewOverrides,
}: {
  key: string;
  formOverrides: OverrideMap;
  previewOverrides: OverrideMap;
}): {
  hasOverride: boolean;
  override: Record<string, unknown> | undefined;
} {
  if (!hasOwn(formOverrides, key)) {
    return { hasOverride: false, override: undefined };
  }

  const formOverride = formOverrides?.[key];
  const previewHasKey = hasOwn(previewOverrides, key);
  const previewOverride = previewHasKey ? previewOverrides?.[key] : undefined;

  // Prefer liquid-resolved preview content when present. An empty preview echo while the form
  // still has fields is lag — keep the form override so the merge preview does not blank out.
  const previewIsEmptyLag =
    previewHasKey && Object.keys(previewOverride ?? {}).length === 0 && Object.keys(formOverride ?? {}).length > 0;

  return {
    hasOverride: true,
    override: previewHasKey && !previewIsEmptyLag ? previewOverride : formOverride,
  };
}

/**
 * Whether the merge keeps the provider value under an overlay key. Mirrors the worker's lodash
 * `mergeWith` with array replacement: an `undefined` overlay is skipped, and an object merged into
 * an array leaves the array as sent.
 */
function keepsBaseValue(baseValue: unknown, overlayValue: unknown): boolean {
  return overlayValue === undefined || (Array.isArray(baseValue) && isRecord(overlayValue));
}

/**
 * Layers an integration override over its provider override the way the send path does: objects
 * merge key by key, while arrays and scalars from the integration replace the provider's value whole.
 */
export function mergeOverrideLayers(
  base: Record<string, unknown>,
  overlay: Record<string, unknown>
): Record<string, unknown> {
  const keys = new Set([...Object.keys(base), ...Object.keys(overlay)]);

  // `Object.fromEntries` defines own properties, so a `__proto__` key stays data.
  return Object.fromEntries(
    [...keys].map((key) => {
      const baseValue = base[key];
      const overlayValue = overlay[key];

      if (!hasOwn(overlay, key) || keepsBaseValue(baseValue, overlayValue)) {
        return [key, baseValue];
      }

      return [
        key,
        isRecord(baseValue) && isRecord(overlayValue) ? mergeOverrideLayers(baseValue, overlayValue) : overlayValue,
      ];
    })
  );
}

/** Dotted paths in `mergeOverrideLayers(base, overlay)` whose value comes from `base` alone. */
export function getInheritedOverridePaths(base: Record<string, unknown>, overlay: Record<string, unknown>): string[] {
  return Object.keys(base).flatMap((key) => {
    const baseValue = base[key];
    const overlayValue = overlay[key];

    if (!hasOwn(overlay, key) || keepsBaseValue(baseValue, overlayValue)) {
      return [key];
    }

    return isRecord(baseValue) && isRecord(overlayValue)
      ? getInheritedOverridePaths(baseValue, overlayValue).map((path) => `${key}.${path}`)
      : [];
  });
}

/**
 * Resolves what a content source sends, before the default content is merged in: a provider
 * source's own override, or an integration's override layered over its provider's.
 */
export function resolveSourceOverrideForPreview({
  source,
  formOverrides,
  previewOverrides,
}: {
  source: OverrideContentSource;
  formOverrides: OverrideValues;
  previewOverrides: OverrideValues | undefined;
}): {
  hasOverride: boolean;
  override: Record<string, unknown> | undefined;
  inheritedPaths: string[];
} {
  const providerLayer = resolveOverrideForPreview({
    key: source.providerId,
    formOverrides: formOverrides.providerOverrides,
    previewOverrides: previewOverrides?.providerOverrides,
  });

  if (source.integrationIdentifier === undefined) {
    return { ...providerLayer, inheritedPaths: [] };
  }

  const integrationLayer = resolveOverrideForPreview({
    key: source.integrationIdentifier,
    formOverrides: formOverrides.integrationOverrides?.[source.providerId],
    previewOverrides: previewOverrides?.integrationOverrides?.[source.providerId],
  });

  if (!providerLayer.hasOverride && !integrationLayer.hasOverride) {
    return { hasOverride: false, override: undefined, inheritedPaths: [] };
  }

  const base = providerLayer.override ?? {};
  const overlay = integrationLayer.override ?? {};

  return {
    hasOverride: true,
    override: mergeOverrideLayers(base, overlay),
    inheritedPaths: getInheritedOverridePaths(base, overlay),
  };
}

/**
 * `buildAnnotatedPreviewLines` with inherited paths marked too. The shared builder marks a single
 * path per call, so each inherited path is located with its own pass over the same object.
 */
export function buildOverridePreviewLines(
  merged: Record<string, unknown>,
  defaultContentKey: string | undefined,
  inheritedPaths: string[]
): OverridePreviewLine[] {
  const lines = buildAnnotatedPreviewLines(merged, defaultContentKey);
  if (inheritedPaths.length === 0) {
    return lines;
  }

  const inheritedLineIndexes = new Set(
    inheritedPaths.flatMap((path) =>
      buildAnnotatedPreviewLines(merged, path).flatMap((line, index) => (line.isDefaultContentKey ? [index] : []))
    )
  );

  return lines.map((line, index) => (inheritedLineIndexes.has(index) ? { ...line, isInherited: true } : line));
}

/** The preview response's override maps under a stable identity, so the preview memo only reruns on new data. */
export function usePreviewOverrideValues(preview: OverrideValues | undefined): OverrideValues {
  const providerOverrides = preview?.providerOverrides;
  const integrationOverrides = preview?.integrationOverrides;

  return useMemo(() => ({ providerOverrides, integrationOverrides }), [providerOverrides, integrationOverrides]);
}

/**
 * Merges the compiled step body into the source's override the same way the send path does, so the
 * preview marks which line the default content filled in and which ones an integration inherits.
 */
export function useAnnotatedOverridePreview({
  body,
  source,
  formOverrides,
  previewOverrides,
}: {
  body: string;
  source: OverrideContentSource | undefined;
  formOverrides: OverrideValues;
  previewOverrides: OverrideValues | undefined;
}): AnnotatedOverridePreview | undefined {
  const providerId = source?.providerId;
  const integrationIdentifier = source?.integrationIdentifier;

  return useMemo(() => {
    if (!providerId) {
      return undefined;
    }

    const { hasOverride, override, inheritedPaths } = resolveSourceOverrideForPreview({
      source: { providerId, integrationIdentifier },
      formOverrides,
      previewOverrides,
    });
    const { merged, defaultContentKey } = mergeProviderPreview({ body, providerId, override });

    return {
      annotatedLines: buildOverridePreviewLines(merged, defaultContentKey, inheritedPaths),
      defaultContentKey,
      hasOverride,
      hasInheritedKeys: inheritedPaths.length > 0,
    };
  }, [body, providerId, integrationIdentifier, formOverrides, previewOverrides]);
}

export function getInheritedKeysHint(displayName: string): string {
  return `Keys marked INHERITED come from the ${displayName} (all) override.`;
}

function getDefaultContentMergeHint({
  hasOverride,
  defaultContentKey,
  body,
  providerId,
  displayName,
}: {
  hasOverride: boolean;
  defaultContentKey: string | undefined;
  body: string;
  providerId: string;
  displayName: string;
}): string {
  if (hasOverride) {
    if (!defaultContentKey) {
      return 'Override merged over the default content.';
    }

    if (!body) {
      return `Override merged over the default content. "${defaultContentKey}" is taken from your default message (currently empty).`;
    }

    return `Override merged over the default content. "${defaultContentKey}" is taken from your default message.`;
  }

  const primaryKey = getProviderPrimaryContentKey(providerId);
  if (!primaryKey) {
    return `No override for this provider. ${displayName} nests its message content, so the default message is not merged in.`;
  }

  return `No override for this provider. Default message maps to "${primaryKey}".`;
}

/** Explains, under the merged JSON, where each part of the payload came from. */
export function getMergedOverrideHint({
  hasInheritedKeys = false,
  ...hintContext
}: {
  hasOverride: boolean;
  defaultContentKey: string | undefined;
  body: string;
  providerId: string;
  displayName: string;
  hasInheritedKeys?: boolean;
}): string {
  const hint = getDefaultContentMergeHint(hintContext);

  return hasInheritedKeys ? `${hint} ${getInheritedKeysHint(hintContext.displayName)}` : hint;
}
