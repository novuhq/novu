import { mapTokenExchangeErrorCode } from '../mcp-oauth-callback/mcp-oauth-callback.usecase';
import type { DcrTokenExchangeOutcome, DcrTokenResponse } from './dcr-provider-strategy';

function pickProviderErrorCode(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') {
    return undefined;
  }

  const data = body as { error?: unknown; message?: unknown };

  if (typeof data.error === 'string' && data.error.length > 0 && data.error.length <= 64) {
    return data.error;
  }

  if (typeof data.message === 'string' && data.message.length > 0 && data.message.length <= 64) {
    return data.message;
  }

  return undefined;
}

function parseTokenResponseBody(body: unknown): DcrTokenResponse | null {
  if (!body || typeof body !== 'object') {
    return null;
  }

  const data = body as Record<string, unknown>;

  if (typeof data.access_token !== 'string' || data.access_token.length === 0) {
    return null;
  }

  const refreshToken = typeof data.refresh_token === 'string' ? data.refresh_token : undefined;
  const expiresIn =
    typeof data.expires_in === 'number' && Number.isFinite(data.expires_in) ? data.expires_in : undefined;
  const tokenType = typeof data.token_type === 'string' ? data.token_type : undefined;
  const scope = typeof data.scope === 'string' ? data.scope : undefined;

  return {
    access_token: data.access_token,
    refresh_token: refreshToken,
    expires_in: expiresIn,
    token_type: tokenType,
    scope,
  };
}

/**
 * Pure default interpretation for a DCR token-endpoint response. Matches the
 * generic branch in `McpOAuthCallback.exchangeCode` before any per-provider
 * strategy override.
 */
export function resolveDefaultDcrTokenExchangeOutcome(statusCode: number, body: unknown): DcrTokenExchangeOutcome {
  if (statusCode < 200 || statusCode >= 300) {
    const providerError = pickProviderErrorCode(body);
    const mappedCode = mapTokenExchangeErrorCode(statusCode, providerError);

    return {
      kind: 'error',
      code: mappedCode,
      message: providerError ? `Token exchange failed: ${providerError}` : 'Token exchange failed.',
      providerError,
      logVariant: 'non_2xx',
    };
  }

  const inlineProviderError = pickProviderErrorCode(body);
  if (inlineProviderError) {
    const mappedCode = mapTokenExchangeErrorCode(statusCode, inlineProviderError);

    return {
      kind: 'error',
      code: mappedCode,
      message: `Token exchange failed: ${inlineProviderError}`,
      providerError: inlineProviderError,
      logVariant: 'inline_error',
    };
  }

  const parsed = parseTokenResponseBody(body);
  if (!parsed) {
    return {
      kind: 'error',
      code: 'mcp_token_exchange_failed',
      message: 'Token exchange returned a malformed response.',
      logVariant: 'malformed',
    };
  }

  return { kind: 'success', tokens: parsed };
}
