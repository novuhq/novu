import {
  ChannelTypeEnum,
  getToolProviderOverrideKeys,
  type IProviderConfig,
  providers,
  TOOL_CONTENT_OVERRIDE_PROVIDER_IDS,
  type ToolContentOverrideProviderId,
  ToolProviderIdEnum,
} from '@novu/shared';

export const DEFAULT_CONTENT_SOURCE = 'default' as const;
export const WEBHOOK_TOOL_PROVIDER_ID = ToolProviderIdEnum.Webhook;

export type DashboardToolContentOverrideProviderId = ToolContentOverrideProviderId | typeof WEBHOOK_TOOL_PROVIDER_ID;
export type ToolContentSource = typeof DEFAULT_CONTENT_SOURCE | DashboardToolContentOverrideProviderId;

export type ToolProviderOverrides = Partial<Record<DashboardToolContentOverrideProviderId, Record<string, unknown>>>;

export type ToolOverrideProviderOption = {
  providerId: DashboardToolContentOverrideProviderId;
  displayName: string;
  hasOverride: boolean;
  isConnected: boolean;
};

export function isToolContentOverrideProviderId(value: string): value is DashboardToolContentOverrideProviderId {
  return (
    value === WEBHOOK_TOOL_PROVIDER_ID || (TOOL_CONTENT_OVERRIDE_PROVIDER_IDS as readonly string[]).includes(value)
  );
}

export function getToolOverrideProviderConfig(
  providerId: DashboardToolContentOverrideProviderId
): IProviderConfig | undefined {
  return providers.find((provider) => provider.id === providerId && provider.channel === ChannelTypeEnum.TOOL);
}

export function getToolOverrideProviderDisplayName(providerId: DashboardToolContentOverrideProviderId): string {
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
  ) as Set<DashboardToolContentOverrideProviderId>;

  const providerIds = [
    ...new Set<DashboardToolContentOverrideProviderId>([
      ...TOOL_CONTENT_OVERRIDE_PROVIDER_IDS,
      WEBHOOK_TOOL_PROVIDER_ID,
    ]),
  ];

  return providerIds
    .filter((providerId) => activeProviderIds.has(providerId) || overrideKeys.has(providerId))
    .map((providerId) => ({
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

export function getUnsupportedToolOverrideKeys(
  providerId: DashboardToolContentOverrideProviderId,
  override: Record<string, unknown> | undefined
): string[] {
  if (providerId === WEBHOOK_TOOL_PROVIDER_ID) {
    return [];
  }

  const allowedKeys = new Set(getToolProviderOverrideKeys(providerId) ?? []);

  return Object.keys(override ?? {}).filter((key) => !allowedKeys.has(key));
}
