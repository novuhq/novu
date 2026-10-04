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

export const INTEGRATION_OVERRIDES_FIELD = 'integrationOverrides';

/** Channels whose steps can carry per-provider content overrides. */
export type OverrideChannel = ChannelTypeEnum.CHAT | ChannelTypeEnum.TOOL;

/**
 * A provider override, applied to every integration of that provider, or — with an
 * `integrationIdentifier` — one integration's override merged on top of it.
 */
export type OverrideContentSource = {
  providerId: ContentOverrideProviderId;
  integrationIdentifier?: string;
};

export type ContentSource = typeof DEFAULT_CONTENT_SOURCE | OverrideContentSource;

export type ProviderOverrides = Partial<Record<ContentOverrideProviderId, Record<string, unknown>>>;

/** Keyed by providerId, then by integration identifier. */
export type IntegrationOverrides = Partial<Record<ContentOverrideProviderId, Record<string, Record<string, unknown>>>>;

/** The override form fields; the preview API echoes the same two maps, Liquid-resolved. */
export type OverrideValues = {
  providerOverrides?: ProviderOverrides | null;
  integrationOverrides?: IntegrationOverrides | null;
};

export type ActiveOverrideIntegration = {
  providerId: string;
  identifier: string;
  name: string;
};

export type IntegrationOverrideOption = {
  providerId: ContentOverrideProviderId;
  integrationIdentifier: string;
  /** Falls back to the identifier when no active integration carries it any more. */
  name: string;
  hasOverride: boolean;
  isConnected: boolean;
  isEscapeHatch: boolean;
};

export type ProviderOverrideOption = {
  providerId: ContentOverrideProviderId;
  displayName: string;
  hasOverride: boolean;
  isConnected: boolean;
  isEscapeHatch: boolean;
  /** Empty unless the provider's integrations are listed individually. */
  integrations: IntegrationOverrideOption[];
};

/** Integration identifiers are free-form, so `in` would also match prototype keys like `constructor`. */
export function hasOwn(target: object | null | undefined, key: string): boolean {
  return !!target && Object.prototype.hasOwnProperty.call(target, key);
}

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

/**
 * Integrations are listed individually once a provider has two or more of them, or as soon as one
 * already carries an override — including one whose integration is gone, so its data is never stranded.
 */
function buildIntegrationOptions({
  providerId,
  activeIntegrations,
  overrides,
  isEscapeHatch,
}: {
  providerId: ContentOverrideProviderId;
  activeIntegrations: ActiveOverrideIntegration[];
  overrides: Record<string, Record<string, unknown>> | undefined;
  isEscapeHatch: boolean;
}): IntegrationOverrideOption[] {
  const overrideIdentifiers = Object.keys(overrides ?? {});
  const optionsByIdentifier = new Map<string, IntegrationOverrideOption>();

  for (const integration of activeIntegrations) {
    optionsByIdentifier.set(integration.identifier, {
      providerId,
      integrationIdentifier: integration.identifier,
      name: integration.name,
      hasOverride: hasOwn(overrides, integration.identifier),
      isConnected: true,
      isEscapeHatch,
    });
  }

  if (optionsByIdentifier.size < 2 && overrideIdentifiers.length === 0) {
    return [];
  }

  for (const identifier of overrideIdentifiers) {
    if (!optionsByIdentifier.has(identifier)) {
      optionsByIdentifier.set(identifier, {
        providerId,
        integrationIdentifier: identifier,
        name: identifier,
        hasOverride: true,
        isConnected: false,
        isEscapeHatch,
      });
    }
  }

  return [...optionsByIdentifier.values()].sort((left, right) => {
    if (left.hasOverride !== right.hasOverride) {
      return left.hasOverride ? -1 : 1;
    }

    return left.name.localeCompare(right.name);
  });
}

export function buildProviderOverrideOptions({
  channel,
  activeIntegrations,
  providerOverrides,
  integrationOverrides,
  includeIntegrationOptions,
}: {
  channel: OverrideChannel;
  activeIntegrations: ActiveOverrideIntegration[];
  providerOverrides: ProviderOverrides | null | undefined;
  integrationOverrides: IntegrationOverrides | null | undefined;
  includeIntegrationOptions: boolean;
}): ProviderOverrideOption[] {
  const activeIntegrationsByProvider = new Map<string, ActiveOverrideIntegration[]>();

  for (const integration of activeIntegrations) {
    activeIntegrationsByProvider.set(integration.providerId, [
      ...(activeIntegrationsByProvider.get(integration.providerId) ?? []),
      integration,
    ]);
  }

  const overrideKeys = new Set(
    Object.keys(providerOverrides ?? {}).filter((providerId) => isContentOverrideProviderId(channel, providerId))
  );
  const integrationOverrideKeys = new Set(
    includeIntegrationOptions
      ? Object.entries(integrationOverrides ?? {})
          .filter(([, overridesByIdentifier]) => Object.keys(overridesByIdentifier ?? {}).length > 0)
          .map(([providerId]) => providerId)
      : []
  );

  return (
    getContentOverrideProviderIds(channel)
      .filter(
        (providerId) =>
          activeIntegrationsByProvider.has(providerId) ||
          overrideKeys.has(providerId) ||
          integrationOverrideKeys.has(providerId)
      )
      .map((providerId) => {
        const isEscapeHatch = isEscapeHatchProvider(providerId);

        return {
          providerId,
          displayName: getOverrideProviderDisplayName(providerId),
          hasOverride: providerId in (providerOverrides ?? {}),
          isConnected: activeIntegrationsByProvider.has(providerId),
          isEscapeHatch,
          integrations: includeIntegrationOptions
            ? buildIntegrationOptions({
                providerId,
                activeIntegrations: activeIntegrationsByProvider.get(providerId) ?? [],
                overrides: integrationOverrides?.[providerId],
                isEscapeHatch,
              })
            : [],
        };
      })
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

/** "(all)" tells the provider row apart from the integration rows listed beneath it. */
export function getProviderOptionLabel(option: ProviderOverrideOption): string {
  return option.integrations.length > 0 ? `${option.displayName} (all)` : option.displayName;
}

export function getContentSourceLabel(source: ContentSource, providerOptions: ProviderOverrideOption[]): string {
  if (source === DEFAULT_CONTENT_SOURCE) {
    return 'Default content';
  }

  const providerOption = providerOptions.find((option) => option.providerId === source.providerId);
  const displayName = providerOption?.displayName ?? getOverrideProviderDisplayName(source.providerId);

  if (source.integrationIdentifier === undefined) {
    return providerOption ? getProviderOptionLabel(providerOption) : displayName;
  }

  const integrationOption = providerOption?.integrations.find(
    (option) => option.integrationIdentifier === source.integrationIdentifier
  );

  return `${displayName} · ${integrationOption?.name ?? source.integrationIdentifier}`;
}

export function isSameContentSource(left: ContentSource, right: ContentSource): boolean {
  if (left === DEFAULT_CONTENT_SOURCE || right === DEFAULT_CONTENT_SOURCE) {
    return left === right;
  }

  return left.providerId === right.providerId && left.integrationIdentifier === right.integrationIdentifier;
}

/** Drops any extra fields, e.g. when a dropdown option is selected as the source. */
export function toOverrideSource({ providerId, integrationIdentifier }: OverrideContentSource): OverrideContentSource {
  return integrationIdentifier === undefined ? { providerId } : { providerId, integrationIdentifier };
}

export function getOverrideFormField(
  source: OverrideContentSource
): typeof PROVIDER_OVERRIDES_FIELD | typeof INTEGRATION_OVERRIDES_FIELD {
  return source.integrationIdentifier === undefined ? PROVIDER_OVERRIDES_FIELD : INTEGRATION_OVERRIDES_FIELD;
}

/** The source's control path, which server control issues for its override are namespaced under. */
export function getOverridePath(source: OverrideContentSource): string {
  if (source.integrationIdentifier === undefined) {
    return `${PROVIDER_OVERRIDES_FIELD}.${source.providerId}`;
  }

  return `${INTEGRATION_OVERRIDES_FIELD}.${source.providerId}.${source.integrationIdentifier}`;
}

/**
 * The override path a server control issue belongs to. Provider ids never contain dots, so the
 * provider is read off the path; integration identifiers are free-form, so the issue is matched
 * against the known integration override paths, the longest (most specific) one winning.
 */
export function getOverrideIssueOwnerPath(
  issuePath: string,
  integrationOverridePaths: readonly string[]
): string | undefined {
  if (issuePath.startsWith(`${PROVIDER_OVERRIDES_FIELD}.`)) {
    const providerId = issuePath.slice(PROVIDER_OVERRIDES_FIELD.length + 1).split('.')[0];

    return `${PROVIDER_OVERRIDES_FIELD}.${providerId}`;
  }

  let ownerPath: string | undefined;

  for (const path of integrationOverridePaths) {
    const ownsIssue = issuePath === path || issuePath.startsWith(`${path}.`);
    if (ownsIssue && path.length > (ownerPath?.length ?? 0)) {
      ownerPath = path;
    }
  }

  return ownerPath;
}

export function getSourceOverride(
  source: OverrideContentSource,
  values: OverrideValues
): Record<string, unknown> | undefined {
  const { providerId, integrationIdentifier } = source;

  if (integrationIdentifier === undefined) {
    return hasOwn(values.providerOverrides, providerId) ? values.providerOverrides?.[providerId] : undefined;
  }

  const overridesByIdentifier = values.integrationOverrides?.[providerId];

  return hasOwn(overridesByIdentifier, integrationIdentifier)
    ? overridesByIdentifier?.[integrationIdentifier]
    : undefined;
}

/** Sets one entry in place (or removes it when `value` is undefined); an emptied map becomes `null`. */
function withEntry<T>(
  map: Partial<Record<string, T>> | null | undefined,
  key: string,
  value: T | undefined
): Record<string, T> | null {
  const next = { ...map } as Record<string, T>;

  if (value === undefined) {
    delete next[key];
  } else {
    next[key] = value;
  }

  return Object.keys(next).length > 0 ? next : null;
}

/**
 * The next value of the source's form field (`getOverrideFormField`) after setting its override, or
 * removing it when `next` is undefined. Emptied per-provider integration maps are dropped, and an
 * emptied field becomes `null` — the save API's delete-all contract, where `undefined` would be omitted
 * and leave the stored overrides intact.
 */
export function updateSourceOverride(
  source: OverrideContentSource,
  values: OverrideValues,
  next: Record<string, unknown> | undefined
): ProviderOverrides | IntegrationOverrides | null {
  const { providerId, integrationIdentifier } = source;

  if (integrationIdentifier === undefined) {
    return withEntry(values.providerOverrides, providerId, next);
  }

  const overridesByIdentifier = withEntry(values.integrationOverrides?.[providerId], integrationIdentifier, next);

  return withEntry(values.integrationOverrides, providerId, overridesByIdentifier ?? undefined);
}

/** Every override held in the form for this channel's providers, in map order. */
export function listSourceOverrides(
  channel: OverrideChannel,
  values: OverrideValues
): Array<{ source: OverrideContentSource; override: Record<string, unknown> }> {
  const providerEntries = Object.entries(values.providerOverrides ?? {}).flatMap(([providerId, override]) =>
    isContentOverrideProviderId(channel, providerId) ? [{ source: { providerId }, override: override ?? {} }] : []
  );
  const integrationEntries = Object.entries(values.integrationOverrides ?? {}).flatMap(
    ([providerId, overridesByIdentifier]) =>
      isContentOverrideProviderId(channel, providerId)
        ? Object.entries(overridesByIdentifier ?? {}).map(([integrationIdentifier, override]) => ({
            source: { providerId, integrationIdentifier },
            override,
          }))
        : []
  );

  return [...providerEntries, ...integrationEntries];
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
 * True when a control-issue path is a top-level key under an override path (`getOverridePath`).
 * Those UNSUPPORTED_PROPERTY issues are mirrored client-side by `getUnsupportedOverrideKeys`;
 * nested paths (e.g. `…document.link`) are not, so the server issue must still be shown.
 */
export function isTopLevelOverrideIssuePath(issuePath: string, overridePath: string): boolean {
  if (!issuePath.startsWith(`${overridePath}.`)) {
    return false;
  }

  const relative = issuePath.slice(overridePath.length + 1);

  return relative.length > 0 && !relative.includes('.');
}

/**
 * Whether a server control issue should still be shown for a provider or integration override.
 * Top-level UNSUPPORTED_PROPERTY is mirrored client-side; nested ones are not.
 */
export function shouldKeepServerOverrideIssue(
  issue: { issueType: string; variableName?: string },
  fallbackPath: string,
  overridePath: string
): boolean {
  if (issue.issueType !== ContentIssueEnum.UNSUPPORTED_PROPERTY) {
    return true;
  }

  return !isTopLevelOverrideIssuePath(issue.variableName ?? fallbackPath, overridePath);
}
