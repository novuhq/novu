import { findProviderOption, getOverrideProviderDisplayName, type ProviderOverrideOption } from './override-options';
import { type ContentSource, DEFAULT_CONTENT_SOURCE, type OverrideContentSource } from './override-source';

export const DEFAULT_CONTENT_LABEL = 'Default content';

export const ALL_INTEGRATIONS_LABEL = 'All integrations';

export type OverrideSourceDescription = {
  providerName: string;
  /**
   * The name the override is shown under: its integration (falling back to the identifier once the
   * integration is gone), "All integrations" while the provider's integrations are listed beneath it,
   * or the provider itself.
   */
  ownerLabel: string;
  /** The owner qualified by its provider, e.g. "Slack · Prod" or "Slack · All integrations". */
  qualifiedLabel: string;
  /** Whether the source sits under a provider group, so both the provider and the owner are named. */
  isGrouped: boolean;
  /** The identifier of the one integration the override reaches, when there is exactly one. */
  ownerIdentifier?: string;
};

export function describeOverrideSource(
  source: OverrideContentSource,
  providerOptions: ProviderOverrideOption[]
): OverrideSourceDescription {
  const providerOption = findProviderOption(providerOptions, source.providerId);
  const providerName = providerOption?.displayName ?? getOverrideProviderDisplayName(source.providerId);

  switch (source.kind) {
    case 'provider': {
      const isGrouped = (providerOption?.integrations.length ?? 0) > 0;
      const ownerLabel = isGrouped ? ALL_INTEGRATIONS_LABEL : providerName;

      return {
        providerName,
        ownerLabel,
        qualifiedLabel: isGrouped ? `${providerName} · ${ownerLabel}` : providerName,
        isGrouped,
        ownerIdentifier: providerOption?.soleIntegrationIdentifier,
      };
    }
    case 'integration': {
      const integrationOption = providerOption?.integrations.find(
        (option) => option.source.integrationIdentifier === source.integrationIdentifier
      );
      const ownerLabel = integrationOption?.name ?? source.integrationIdentifier;

      return {
        providerName,
        ownerLabel,
        qualifiedLabel: `${providerName} · ${ownerLabel}`,
        isGrouped: true,
        ownerIdentifier: source.integrationIdentifier,
      };
    }
    default: {
      const unhandled: never = source;

      return unhandled;
    }
  }
}

export function getContentSourceLabel(source: ContentSource, providerOptions: ProviderOverrideOption[]): string {
  if (source === DEFAULT_CONTENT_SOURCE) {
    return DEFAULT_CONTENT_LABEL;
  }

  return describeOverrideSource(source, providerOptions).qualifiedLabel;
}
