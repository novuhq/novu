export function mapProvidersToPreviewOverrides(
  providers?: Record<string, Record<string, unknown>>
): Record<string, Record<string, unknown>> | undefined {
  if (!providers) {
    return undefined;
  }

  const result: Record<string, Record<string, unknown>> = {};

  for (const [providerId, payload] of Object.entries(providers)) {
    const { _passthrough: _, ...rest } = payload;

    if (Object.keys(rest).length === 0) {
      continue;
    }

    result[providerId] = rest;
  }

  if (Object.keys(result).length === 0) {
    return undefined;
  }

  return result;
}
