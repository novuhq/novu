import { ChatProviderIdEnum } from '../../../types';
import { getAtPath, setAtPath } from './path';
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

  // LINE nests body content in `messages[]`. Mirror the send path: inject a text message from the
  // step body only when the override does not already supply `messages`.
  if (providerId === ChatProviderIdEnum.Line) {
    return mergeLineProviderPreview(body, merged);
  }

  if (!primaryKey) {
    return { merged };
  }

  if (!getAtPath(merged, primaryKey)) {
    return { merged: setAtPath(merged, primaryKey, body), defaultContentKey: primaryKey };
  }

  return { merged };
}

function mergeLineProviderPreview(body: string, merged: Record<string, unknown>): MergedProviderPreview {
  if (Array.isArray(merged.messages)) {
    return { merged };
  }

  return {
    merged: {
      ...merged,
      messages: [{ type: 'text', text: body }],
    },
    defaultContentKey: 'messages.0.text',
  };
}

/** @deprecated Renamed to `MergedProviderPreview`. */
export type MergedToolPreview = MergedProviderPreview;

/** @deprecated Renamed to `mergeProviderPreview`. */
export const mergeToolProviderPreview = mergeProviderPreview;
