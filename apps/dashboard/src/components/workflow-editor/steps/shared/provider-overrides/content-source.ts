import {
  ChannelTypeEnum,
  ContentIssueEnum,
  type ContentOverrideProviderId,
  getContentOverrideProviderIds,
  getProviderOverrideConfig,
  getProviderOverrideKeys,
  type IProviderConfig,
  providers,
} from '@novu/shared';

export const DEFAULT_CONTENT_SOURCE = 'default' as const;

export const PROVIDER_OVERRIDES_FIELD = 'providerOverrides';

/** Channels whose steps can carry per-provider content overrides. */
export type OverrideChannel = ChannelTypeEnum.CHAT | ChannelTypeEnum.TOOL | ChannelTypeEnum.PUSH;

export type ContentSource = typeof DEFAULT_CONTENT_SOURCE | ContentOverrideProviderId;

export type ProviderOverrides = Partial<Record<ContentOverrideProviderId, Record<string, unknown>>>;

export type ProviderOverrideOption = {
  providerId: ContentOverrideProviderId;
  displayName: string;
  hasOverride: boolean;
  isConnected: boolean;
  isEscapeHatch: boolean;
};

export function isContentOverrideProviderId(
  channel: OverrideChannel,
  value: string
): value is ContentOverrideProviderId {
  return (getContentOverrideProviderIds(channel) as readonly string[]).includes(value);
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

  return (
    getContentOverrideProviderIds(channel)
      .filter((providerId) => activeProviderIds.has(providerId) || overrideKeys.has(providerId))
      .map((providerId) => ({
        providerId,
        displayName: getOverrideProviderDisplayName(providerId),
        hasOverride: providerId in (providerOverrides ?? {}),
        isConnected: activeProviderIds.has(providerId),
        isEscapeHatch: isEscapeHatchProvider(providerId),
      }))
      // Configured overrides first (selectable / hold data), then schema-backed providers before
      // escape-hatch ("no schema") ones; alphabetical within each group for stable ordering.
      .sort((left, right) => {
        if (left.hasOverride !== right.hasOverride) {
          return left.hasOverride ? -1 : 1;
        }

        if (left.isEscapeHatch !== right.isEscapeHatch) {
          return left.isEscapeHatch ? 1 : -1;
        }

        return left.displayName.localeCompare(right.displayName);
      })
  );
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

/**
 * True when a control-issue path is a top-level key under `providerOverrides.<providerId>`.
 * Those UNSUPPORTED_PROPERTY issues are mirrored client-side by `getUnsupportedOverrideKeys`;
 * nested paths (e.g. `…document.link`) are not, so the server issue must still be shown.
 */
export function isTopLevelOverrideIssuePath(issuePath: string, providerPathPrefix: string): boolean {
  if (!issuePath.startsWith(`${providerPathPrefix}.`)) {
    return false;
  }

  const relative = issuePath.slice(providerPathPrefix.length + 1);

  return relative.length > 0 && !relative.includes('.');
}

/**
 * Whether a server control issue should still be shown for a provider override.
 * Top-level UNSUPPORTED_PROPERTY is mirrored client-side; nested ones are not.
 */
export function shouldKeepServerOverrideIssue(
  issue: { issueType: string; variableName?: string },
  fallbackPath: string,
  providerPathPrefix: string
): boolean {
  if (issue.issueType !== ContentIssueEnum.UNSUPPORTED_PROPERTY) {
    return true;
  }

  return !isTopLevelOverrideIssuePath(issue.variableName ?? fallbackPath, providerPathPrefix);
}
