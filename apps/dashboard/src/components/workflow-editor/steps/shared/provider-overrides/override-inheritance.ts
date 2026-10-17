import type { ProviderOverrideOption } from './override-options';
import {
  type ContentSource,
  DEFAULT_CONTENT_SOURCE,
  getSourceOverride,
  integrationSource,
  type OverrideContentSource,
  type OverrideValues,
  providerSource,
} from './override-source';
import { ALL_INTEGRATIONS_LABEL, DEFAULT_CONTENT_LABEL, describeOverrideSource } from './override-source-description';

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

const DEFAULT_CONTENT_LAYER = { label: DEFAULT_CONTENT_LABEL, source: DEFAULT_CONTENT_SOURCE };

/** What an override starts from before its own keys apply, and which integrations replace its keys. */
export function buildOverrideInheritance(
  source: OverrideContentSource,
  providerOptions: ProviderOverrideOption[],
  overrides: OverrideValues
): OverrideInheritance {
  const description = describeOverrideSource(source, providerOptions);

  switch (source.kind) {
    case 'integration': {
      const parent = providerSource(source.providerId);
      const providerOverride = getSourceOverride(parent, overrides);
      const hasInheritedKeys = Object.keys(providerOverride ?? {}).length > 0;
      const inheritsFrom = providerOverride === undefined ? DEFAULT_CONTENT_LABEL : ALL_INTEGRATIONS_LABEL;

      return {
        emptyMessage: `${description.ownerLabel} inherits everything from ${inheritsFrom}. Add only the keys that should differ.`,
        inheritedOverride: hasInheritedKeys ? providerOverride : undefined,
        overriddenKeyLabels: {},
        mergesOver:
          providerOverride === undefined
            ? [DEFAULT_CONTENT_LAYER]
            : [
                DEFAULT_CONTENT_LAYER,
                { label: describeOverrideSource(parent, providerOptions).qualifiedLabel, source: parent },
              ],
        ownerLabel: description.ownerLabel,
        ownerIdentifier: description.ownerIdentifier,
      };
    }
    case 'provider': {
      const { providerName } = description;
      const integrationNamesByKey = new Map<string, string[]>();

      for (const [identifier, integrationOverride] of Object.entries(
        overrides.integrationOverrides?.[source.providerId] ?? {}
      )) {
        const integrationName = describeOverrideSource(
          integrationSource(source.providerId, identifier),
          providerOptions
        ).ownerLabel;

        for (const key of Object.keys(integrationOverride ?? {})) {
          integrationNamesByKey.set(key, [...(integrationNamesByKey.get(key) ?? []), integrationName]);
        }
      }

      const owner = description.isGrouped ? `All ${providerName} integrations inherit` : `${providerName} inherits`;

      return {
        emptyMessage: `${owner} everything from ${DEFAULT_CONTENT_LABEL}. Add only the keys that should differ.`,
        overriddenKeyLabels: Object.fromEntries(
          [...integrationNamesByKey].map(([key, names]) => [
            key,
            names.length === 1 ? `Overridden in ${names[0]}` : `Overridden in ${names.length} integrations`,
          ])
        ),
        mergesOver: [DEFAULT_CONTENT_LAYER],
        ownerLabel: description.qualifiedLabel,
        ownerIdentifier: description.ownerIdentifier,
      };
    }
    default: {
      const unhandled: never = source;

      return unhandled;
    }
  }
}
