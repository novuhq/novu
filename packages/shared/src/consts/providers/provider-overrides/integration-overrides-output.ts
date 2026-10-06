import { isRecord } from './path';
import { INTEGRATION_OVERRIDES_OUTPUT_KEY } from './provider-override-registry';

type OverrideBlob = Record<string, unknown>;

export type UnpackedProviderOverrideOutput = {
  providerOverride: OverrideBlob;
  integrationOverrides: Record<string, OverrideBlob>;
};

/** Builds a provider's bridge output entry: its own override plus its integrations' overrides under the reserved key. */
export function packProviderOverrideOutput(
  providerOverride: OverrideBlob,
  integrationOverrides: Record<string, unknown> | undefined
): OverrideBlob {
  const { [INTEGRATION_OVERRIDES_OUTPUT_KEY]: _reserved, ...ownOverride } = providerOverride;

  if (!integrationOverrides || Object.keys(integrationOverrides).length === 0) {
    return ownOverride;
  }

  return { ...ownOverride, [INTEGRATION_OVERRIDES_OUTPUT_KEY]: integrationOverrides };
}

/** Splits a provider's bridge output entry back into its own override and its integrations' overrides. */
export function unpackProviderOverrideOutput(entry: unknown): UnpackedProviderOverrideOutput {
  if (!isRecord(entry)) {
    return { providerOverride: {}, integrationOverrides: {} };
  }

  const { [INTEGRATION_OVERRIDES_OUTPUT_KEY]: packed, ...providerOverride } = entry;
  const integrationOverrides = Object.fromEntries(
    Object.entries(isRecord(packed) ? packed : {}).filter((pair): pair is [string, OverrideBlob] => isRecord(pair[1]))
  );

  return { providerOverride, integrationOverrides };
}
