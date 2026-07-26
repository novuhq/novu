import {
  CHAT_CONTENT_OVERRIDE_PROVIDER_IDS,
  ChannelTypeEnum,
  type ContentOverrideProviderId,
  getProviderOverrideConfig,
  getProviderOverrideKeys,
  type IProviderConfig,
  providers,
  TOOL_CONTENT_OVERRIDE_PROVIDER_IDS,
} from '@novu/shared';

export const DEFAULT_CONTENT_SOURCE = 'default' as const;

export const PROVIDER_OVERRIDES_FIELD = 'providerOverrides';

/** Channels whose steps can carry per-provider content overrides. */
export type OverrideChannel = ChannelTypeEnum.CHAT | ChannelTypeEnum.TOOL;

export type ContentSource = typeof DEFAULT_CONTENT_SOURCE | ContentOverrideProviderId;

export type ProviderOverrides = Partial<Record<ContentOverrideProviderId, Record<string, unknown>>>;

export type ProviderOverrideOption = {
  providerId: ContentOverrideProviderId;
  displayName: string;
  hasOverride: boolean;
  isConnected: boolean;
  isEscapeHatch: boolean;
};

const OVERRIDE_PROVIDER_IDS_BY_CHANNEL = {
  [ChannelTypeEnum.CHAT]: CHAT_CONTENT_OVERRIDE_PROVIDER_IDS,
  [ChannelTypeEnum.TOOL]: TOOL_CONTENT_OVERRIDE_PROVIDER_IDS,
} as const satisfies Record<OverrideChannel, readonly ContentOverrideProviderId[]>;

export function getOverrideProviderIds(channel: OverrideChannel): readonly ContentOverrideProviderId[] {
  return OVERRIDE_PROVIDER_IDS_BY_CHANNEL[channel];
}

export function isContentOverrideProviderId(
  channel: OverrideChannel,
  value: string
): value is ContentOverrideProviderId {
  return (getOverrideProviderIds(channel) as readonly string[]).includes(value);
}

/** Provider ids are globally unique across channels, so no channel filter is needed here. */
function findProviderConfig(providerId: string): IProviderConfig | undefined {
  return providers.find((provider) => provider.id === providerId);
}

export function getOverrideProviderDisplayName(providerId: string): string {
  return findProviderConfig(providerId)?.displayName ?? providerId;
}

export function getProviderDocReference(providerId: string): string | undefined {
  return findProviderConfig(providerId)?.docReference;
}

/**
 * True for providers whose override payload is free-form: no eager schema and no lazily loaded one,
 * so the JSON is merged into the provider API payload without validation or autocomplete.
 */
export function isEscapeHatchProvider(providerId: string): boolean {
  const config = getProviderOverrideConfig(providerId);

  return !config?.schema && !config?.schemaSubpath;
}

export function buildProviderOverrideOptions({
  channel,
  activeProviderIds,
  providerOverrides,
}: {
  channel: OverrideChannel;
  activeProviderIds: Set<string>;
  providerOverrides: ProviderOverrides | undefined;
}): ProviderOverrideOption[] {
  const overrideKeys = new Set(
    Object.keys(providerOverrides ?? {}).filter((providerId) => isContentOverrideProviderId(channel, providerId))
  );

  return getOverrideProviderIds(channel)
    .filter((providerId) => activeProviderIds.has(providerId) || overrideKeys.has(providerId))
    .map((providerId) => ({
      providerId,
      displayName: getOverrideProviderDisplayName(providerId),
      hasOverride: providerId in (providerOverrides ?? {}),
      isConnected: activeProviderIds.has(providerId),
      isEscapeHatch: isEscapeHatchProvider(providerId),
    }));
}

export function getContentSourceLabel(source: ContentSource): string {
  if (source === DEFAULT_CONTENT_SOURCE) {
    return 'Default content';
  }

  return getOverrideProviderDisplayName(source);
}

export function getUnsupportedOverrideKeys(
  providerId: ContentOverrideProviderId,
  override: Record<string, unknown> | undefined
): string[] {
  const allowedKeys = getProviderOverrideKeys(providerId);
  if (!allowedKeys) {
    return [];
  }

  const allowedKeySet = new Set(allowedKeys);

  return Object.keys(override ?? {}).filter((key) => !allowedKeySet.has(key));
}
