interface ProviderErrorResponse {
  status?: unknown;
  statusCode?: unknown;
}

interface ProviderError {
  code?: unknown;
  message?: unknown;
  name?: unknown;
  response?: ProviderErrorResponse;
  status?: unknown;
  statusCode?: unknown;
}

export function serializeProviderError(error: unknown): string {
  const providerError = error as ProviderError;
  const message =
    typeof providerError?.message === 'string' ? providerError.message : String(error ?? 'Unknown provider error');
  const name = typeof providerError?.name === 'string' ? providerError.name : undefined;
  const code =
    typeof providerError?.code === 'string' || typeof providerError?.code === 'number' ? providerError.code : undefined;
  const responseStatus = providerError?.response?.status ?? providerError?.response?.statusCode;
  const status = responseStatus ?? providerError?.status ?? providerError?.statusCode;

  return JSON.stringify({
    message,
    ...(name ? { name } : {}),
    ...(code !== undefined ? { code } : {}),
    ...(typeof status === 'number' ? { status } : {}),
  });
}
