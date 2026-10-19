import {
  type ContentOverrideProviderId,
  getContentOverrideProviderIds,
  getProviderOverrideConfig,
  type IProviderConfig,
  providers,
} from '@novu/shared';
import {
  hasOwn,
  type IntegrationOverrideSource,
  type IntegrationOverrides,
  integrationSource,
  isContentOverrideProviderId,
  type OverrideChannel,
  type ProviderOverrideSource,
  type ProviderOverrides,
  providerSource,
} from './override-source';

export type ActiveOverrideIntegration = {
  providerId: string;
  identifier: string;
  name: string;
};

export type IntegrationOverrideOption = {
  source: IntegrationOverrideSource;
  /** Falls back to the identifier when no active integration carries it any more. */
  name: string;
  hasOverride: boolean;
  isConnected: boolean;
};

export type ProviderOverrideOption = {
  source: ProviderOverrideSource;
  providerId: ContentOverrideProviderId;
  displayName: string;
  hasOverride: boolean;
  isConnected: boolean;
  isEscapeHatch: boolean;
  /** Empty unless the provider's integrations are listed individually. */
  integrations: IntegrationOverrideOption[];
  /** The identifier of the provider's only active integration, when its integrations are not listed. */
  soleIntegrationIdentifier?: string;
};

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

export function findProviderOption(
  providerOptions: ProviderOverrideOption[],
  providerId: string
): ProviderOverrideOption | undefined {
  return providerOptions.find((option) => option.providerId === providerId);
}

/**
 * Integrations are listed individually once a provider has two or more of them, or as soon as one
 * already carries an override — including one whose integration is gone, so its data is never stranded.
 */
function buildIntegrationOptions({
  providerId,
  activeIntegrations,
  overrides,
}: {
  providerId: ContentOverrideProviderId;
  activeIntegrations: ActiveOverrideIntegration[];
  overrides: Record<string, Record<string, unknown>> | undefined;
}): IntegrationOverrideOption[] {
  const overrideIdentifiers = Object.keys(overrides ?? {});
  const optionsByIdentifier = new Map<string, IntegrationOverrideOption>();

  for (const integration of activeIntegrations) {
    optionsByIdentifier.set(integration.identifier, {
      source: integrationSource(providerId, integration.identifier),
      name: integration.name,
      hasOverride: hasOwn(overrides, integration.identifier),
      isConnected: true,
    });
  }

  if (optionsByIdentifier.size < 2 && overrideIdentifiers.length === 0) {
    return [];
  }

  for (const identifier of overrideIdentifiers) {
    if (!optionsByIdentifier.has(identifier)) {
      optionsByIdentifier.set(identifier, {
        source: integrationSource(providerId, identifier),
        name: identifier,
        hasOverride: true,
        isConnected: false,
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
        const providerIntegrations = activeIntegrationsByProvider.get(providerId) ?? [];
        const integrations = includeIntegrationOptions
          ? buildIntegrationOptions({
              providerId,
              activeIntegrations: providerIntegrations,
              overrides: integrationOverrides?.[providerId],
            })
          : [];

        return {
          source: providerSource(providerId),
          providerId,
          displayName: getOverrideProviderDisplayName(providerId),
          hasOverride: hasOwn(providerOverrides, providerId),
          isConnected: providerIntegrations.length > 0,
          isEscapeHatch: isEscapeHatchProvider(providerId),
          integrations,
          ...(integrations.length === 0 && providerIntegrations.length === 1
            ? { soleIntegrationIdentifier: providerIntegrations[0].identifier }
            : {}),
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
