import {
  ChannelTypeEnum,
  getToolProviderPrimaryContentKey,
  type IProviderConfig,
  providers,
  TOOL_CONTENT_OVERRIDE_PROVIDER_IDS,
  type ToolContentOverrideProviderId,
} from '@novu/shared';

export type { AnnotatedPreviewLine, MergedToolPreview } from '@novu/shared';
export { buildAnnotatedPreviewLines, mergeToolProviderPreview } from '@novu/shared';

export const DEFAULT_CONTENT_SOURCE = 'default' as const;

export type ToolContentSource = typeof DEFAULT_CONTENT_SOURCE | ToolContentOverrideProviderId;

export type ToolProviderOverrides = Partial<Record<ToolContentOverrideProviderId, Record<string, unknown>>>;

export type ToolOverrideProviderOption = {
  providerId: ToolContentOverrideProviderId;
  displayName: string;
  hasOverride: boolean;
  isConnected: boolean;
};

export function isToolContentOverrideProviderId(value: string): value is ToolContentOverrideProviderId {
  return (TOOL_CONTENT_OVERRIDE_PROVIDER_IDS as readonly string[]).includes(value);
}

export function getToolOverrideProviderConfig(providerId: ToolContentOverrideProviderId): IProviderConfig | undefined {
  return providers.find((provider) => provider.id === providerId && provider.channel === ChannelTypeEnum.TOOL);
}

export function getToolOverrideProviderDisplayName(providerId: ToolContentOverrideProviderId): string {
  return getToolOverrideProviderConfig(providerId)?.displayName ?? providerId;
}

export function buildToolOverrideProviderOptions({
  activeProviderIds,
  providerOverrides,
}: {
  activeProviderIds: Set<string>;
  providerOverrides: ToolProviderOverrides | undefined;
}): ToolOverrideProviderOption[] {
  const overrideKeys = new Set(
    Object.keys(providerOverrides ?? {}).filter(isToolContentOverrideProviderId)
  ) as Set<ToolContentOverrideProviderId>;

  return TOOL_CONTENT_OVERRIDE_PROVIDER_IDS.filter(
    (providerId) => activeProviderIds.has(providerId) || overrideKeys.has(providerId)
  ).map((providerId) => ({
    providerId,
    displayName: getToolOverrideProviderDisplayName(providerId),
    hasOverride: providerId in (providerOverrides ?? {}),
    isConnected: activeProviderIds.has(providerId),
  }));
}

export function getContentSourceLabel(source: ToolContentSource): string {
  if (source === DEFAULT_CONTENT_SOURCE) {
    return 'Default content';
  }

  return getToolOverrideProviderDisplayName(source);
}

export function getProviderPrimaryContentKey(providerId: ToolContentOverrideProviderId) {
  return getToolProviderPrimaryContentKey(providerId);
}
