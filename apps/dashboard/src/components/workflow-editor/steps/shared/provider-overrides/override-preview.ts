import {
  type AnnotatedPreviewLine,
  buildAnnotatedPreviewLines,
  getProviderPrimaryContentKey,
  mergeProviderPreview,
} from '@novu/shared';
import { useMemo } from 'react';

export const PREVIEW_PANEL_CLASS =
  'bg-neutral-alpha-50 text-foreground-950 min-h-16 overflow-auto rounded-md border border-neutral-100 p-2 font-mono text-[11px] leading-4 [scrollbar-gutter:stable]';

export type AnnotatedOverridePreview = {
  annotatedLines: AnnotatedPreviewLine[];
  defaultContentKey?: string;
  hasOverride: boolean;
};

type ProviderOverrideMap = Partial<Record<string, Record<string, unknown>>> | undefined;

/**
 * Form state is the source of truth for whether an override exists. Preview may lag
 * (`keepPreviousData`, payload hydration) and briefly omit or invent keys — never let that
 * flip the footer/JSON between "no override" and "merged".
 */
export function resolveOverrideForPreview({
  providerId,
  formOverrides,
  previewOverrides,
}: {
  providerId: string | undefined;
  formOverrides: ProviderOverrideMap;
  previewOverrides: ProviderOverrideMap;
}): {
  hasOverride: boolean;
  override: Record<string, unknown> | undefined;
} {
  if (!providerId) {
    return { hasOverride: false, override: undefined };
  }

  const hasOverride = providerId in (formOverrides ?? {});
  if (!hasOverride) {
    return { hasOverride: false, override: undefined };
  }

  const formOverride = formOverrides?.[providerId];
  const previewHasKey = !!previewOverrides && providerId in previewOverrides;
  const previewOverride = previewHasKey ? previewOverrides[providerId] : undefined;

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
 * Merges the compiled step body into the provider override the same way the send path does, so the
 * preview marks which line the default content filled in.
 */
export function useAnnotatedOverridePreview({
  body,
  providerId,
  formOverrides,
  previewOverrides,
}: {
  body: string;
  providerId: string | undefined;
  formOverrides: ProviderOverrideMap;
  previewOverrides: ProviderOverrideMap;
}): AnnotatedOverridePreview | undefined {
  return useMemo(() => {
    if (!providerId) {
      return undefined;
    }

    const { hasOverride, override } = resolveOverrideForPreview({
      providerId,
      formOverrides,
      previewOverrides,
    });
    const { merged, defaultContentKey } = mergeProviderPreview({ body, providerId, override });

    return {
      annotatedLines: buildAnnotatedPreviewLines(merged, defaultContentKey),
      defaultContentKey,
      hasOverride,
    };
  }, [body, providerId, formOverrides, previewOverrides]);
}

/** Explains, under the merged JSON, where each half of the payload came from. */
export function getMergedOverrideHint({
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
      return `This override is deep-merged over the payload ${displayName} builds from the step's default content.`;
    }

    if (!body) {
      return `Override merged over the default content. "${defaultContentKey}" is taken from your default message (currently empty).`;
    }

    return `Override merged over the default content. "${defaultContentKey}" is taken from your default message.`;
  }

  const primaryKey = getProviderPrimaryContentKey(providerId);
  if (!primaryKey) {
    return `No override for this provider. When you add one, it is deep-merged over the payload ${displayName} builds from the step's default content.`;
  }

  return `No override for this provider. Default message maps to "${primaryKey}".`;
}
