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
};

/**
 * Merges the compiled step body into the provider override the same way the send path does, so the
 * preview marks which line the default content filled in.
 */
export function useAnnotatedOverridePreview({
  body,
  providerId,
  override,
}: {
  body: string;
  providerId: string | undefined;
  override: Record<string, unknown> | undefined;
}): AnnotatedOverridePreview | undefined {
  return useMemo(() => {
    if (!providerId) {
      return undefined;
    }

    const { merged, defaultContentKey } = mergeProviderPreview({ body, providerId, override });

    return {
      annotatedLines: buildAnnotatedPreviewLines(merged, defaultContentKey),
      defaultContentKey,
    };
  }, [body, providerId, override]);
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
