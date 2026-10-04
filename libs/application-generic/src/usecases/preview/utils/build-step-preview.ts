import {
  INTEGRATION_OVERRIDES_OUTPUT_KEY,
  isRecord,
  StepTypeEnum,
  supportsContentProviderOverrides,
} from '@novu/shared';

function mapPayloadsToPreview(payloads: Record<string, unknown>): Record<string, Record<string, unknown>> | undefined {
  const result: Record<string, Record<string, unknown>> = {};

  for (const [key, payload] of Object.entries(payloads)) {
    if (!isRecord(payload)) {
      continue;
    }

    const { _passthrough: _, [INTEGRATION_OVERRIDES_OUTPUT_KEY]: __, ...rest } = payload;

    if (Object.keys(rest).length === 0) {
      continue;
    }

    result[key] = rest;
  }

  if (Object.keys(result).length === 0) {
    return undefined;
  }

  return result;
}

export function mapProvidersToPreviewOverrides(
  providers?: Record<string, Record<string, unknown>>
): Record<string, Record<string, unknown>> | undefined {
  if (!providers) {
    return undefined;
  }

  return mapPayloadsToPreview(providers);
}

/**
 * The bridge returns each provider's rendered integration overrides inside that provider's entry,
 * under the reserved key; preview exposes them as their own providerId → identifier map.
 */
export function mapProvidersToPreviewIntegrationOverrides(
  providers?: Record<string, Record<string, unknown>>
): Record<string, Record<string, Record<string, unknown>>> | undefined {
  if (!providers) {
    return undefined;
  }

  const result: Record<string, Record<string, Record<string, unknown>>> = {};

  for (const [providerId, payload] of Object.entries(providers)) {
    const overridesByIdentifier = payload[INTEGRATION_OVERRIDES_OUTPUT_KEY];

    if (!isRecord(overridesByIdentifier)) {
      continue;
    }

    const mapped = mapPayloadsToPreview(overridesByIdentifier);

    if (mapped) {
      result[providerId] = mapped;
    }
  }

  if (Object.keys(result).length === 0) {
    return undefined;
  }

  return result;
}

export function buildStepPreview(
  stepType: StepTypeEnum | string,
  executeOutput: {
    outputs: Record<string, unknown>;
    providers?: Record<string, Record<string, unknown>>;
  }
): Record<string, unknown> {
  if (!supportsContentProviderOverrides(stepType)) {
    return { ...executeOutput.outputs };
  }

  const providerOverrides = mapProvidersToPreviewOverrides(executeOutput.providers);
  const integrationOverrides = mapProvidersToPreviewIntegrationOverrides(executeOutput.providers);

  return {
    ...executeOutput.outputs,
    ...(providerOverrides ? { providerOverrides } : {}),
    ...(integrationOverrides ? { integrationOverrides } : {}),
  };
}
