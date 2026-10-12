import {
  ALL_INTEGRATIONS_LABEL,
  type ContentSource,
  DEFAULT_CONTENT_SOURCE,
  getIntegrationName,
  getOverrideProviderDisplayName,
  getSourceOverride,
  type OverrideContentSource,
  type OverrideValues,
  type ProviderOverrideOption,
} from './content-source';

export type OverrideInheritance = {
  /** Shown while the override has no keys yet, e.g. "PagerDuty EU inherits everything from All integrations." */
  emptyMessage: string;
  /** The provider-wide keys an integration override starts from; offered as a starting point. */
  inheritedOverride?: Record<string, unknown>;
  /** Chip labels for root keys that an integration override replaces, keyed by root key. */
  overriddenKeyLabels: Record<string, string>;
  /** The layers this override is merged over, from the base content up to its direct parent. */
  mergesOver: Array<{ label: string; source: ContentSource }>;
  /** The layer being edited, shown last in the "Merges over" chain. */
  ownerLabel: string;
  ownerIdentifier?: string;
};

/** What an override starts from before its own keys apply, and which integrations replace its keys. */
export function buildOverrideInheritance(
  source: OverrideContentSource,
  providerOptions: ProviderOverrideOption[],
  overrides: OverrideValues
): OverrideInheritance {
  const { providerId, integrationIdentifier } = source;
  const providerOption = providerOptions.find((option) => option.providerId === providerId);
  const providerName = providerOption?.displayName ?? getOverrideProviderDisplayName(providerId);
  const hasIntegrations = !!providerOption && providerOption.integrations.length > 0;
  const allIntegrationsLabel = `${providerName} · ${ALL_INTEGRATIONS_LABEL}`;
  const defaultContentLayer = { label: 'Default content', source: DEFAULT_CONTENT_SOURCE };

  if (integrationIdentifier !== undefined) {
    const providerOverride = getSourceOverride({ providerId }, overrides);
    const hasInheritedKeys = Object.keys(providerOverride ?? {}).length > 0;
    const inheritsFrom = providerOverride === undefined ? 'Default content' : ALL_INTEGRATIONS_LABEL;

    return {
      emptyMessage: `${getIntegrationName(providerId, integrationIdentifier, providerOptions)} inherits everything from ${inheritsFrom}. Add only the keys that should differ.`,
      inheritedOverride: hasInheritedKeys ? providerOverride : undefined,
      overriddenKeyLabels: {},
      mergesOver:
        providerOverride === undefined
          ? [defaultContentLayer]
          : [defaultContentLayer, { label: allIntegrationsLabel, source: { providerId } }],
      ownerLabel: getIntegrationName(providerId, integrationIdentifier, providerOptions),
      ownerIdentifier: integrationIdentifier,
    };
  }

  const integrationNamesByKey = new Map<string, string[]>();

  for (const [identifier, integrationOverride] of Object.entries(overrides.integrationOverrides?.[providerId] ?? {})) {
    const integrationName = getIntegrationName(providerId, identifier, providerOptions);

    for (const key of Object.keys(integrationOverride ?? {})) {
      integrationNamesByKey.set(key, [...(integrationNamesByKey.get(key) ?? []), integrationName]);
    }
  }

  const owner = hasIntegrations ? `All ${providerName} integrations inherit` : `${providerName} inherits`;

  return {
    emptyMessage: `${owner} everything from Default content. Add only the keys that should differ.`,
    overriddenKeyLabels: Object.fromEntries(
      [...integrationNamesByKey].map(([key, names]) => [
        key,
        names.length === 1 ? `Overridden in ${names[0]}` : `Overridden in ${names.length} integrations`,
      ])
    ),
    mergesOver: [defaultContentLayer],
    ownerLabel: hasIntegrations ? allIntegrationsLabel : providerName,
    ownerIdentifier: providerOption?.soleIntegrationIdentifier,
  };
}
