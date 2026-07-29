import { StepTypeEnum, supportsContentProviderOverrides } from '@novu/shared';

function stripSchemaFakerPlaceholderKeys(payload: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(payload).filter(([key]) => !key.includes('[placeholder]')));
}

export function mapProvidersToPreviewOverrides(
  providers?: Record<string, Record<string, unknown>>
): Record<string, Record<string, unknown>> | undefined {
  if (!providers) {
    return undefined;
  }

  const result: Record<string, Record<string, unknown>> = {};

  for (const [providerId, payload] of Object.entries(providers)) {
    const { _passthrough: _, ...rest } = payload;
    const cleaned = stripSchemaFakerPlaceholderKeys(rest);

    if (Object.keys(cleaned).length === 0) {
      continue;
    }

    result[providerId] = cleaned;
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
  const providerOverrides = supportsContentProviderOverrides(stepType)
    ? mapProvidersToPreviewOverrides(executeOutput.providers)
    : undefined;

  return {
    ...executeOutput.outputs,
    ...(providerOverrides ? { providerOverrides } : {}),
  };
}
