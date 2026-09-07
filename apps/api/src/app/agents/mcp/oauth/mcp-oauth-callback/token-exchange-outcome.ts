import type { McpOAuthErrorCode } from '../mcp-oauth-discovery.service';

export interface DcrTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
}

export type DcrTokenExchangeErrorLogVariant = 'non_2xx' | 'inline_error' | 'malformed';

export type DcrTokenExchangeOutcome =
  | { kind: 'success'; tokens: DcrTokenResponse }
  | {
      kind: 'error';
      code: McpOAuthErrorCode;
      message: string;
      providerError?: string;
      logVariant: DcrTokenExchangeErrorLogVariant;
      logMessage: string;
      exceptionMessage: string;
    };

const TOKEN_EXCHANGE_ERROR_LOG_MESSAGES: Record<DcrTokenExchangeErrorLogVariant, string> = {
  non_2xx: 'MCP OAuth token exchange returned non-2xx',
  inline_error: 'MCP OAuth token exchange returned 2xx with inline error',
  malformed: 'MCP OAuth token exchange returned a malformed 2xx body',
};

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

function buildTokenExchangeErrorOutcome(args: {
  code: McpOAuthErrorCode;
  message: string;
  providerError?: string;
  logVariant: DcrTokenExchangeErrorLogVariant;
}): Extract<DcrTokenExchangeOutcome, { kind: 'error' }> {
  const { code, message, providerError, logVariant } = args;
  let exceptionMessage: string;

  if (logVariant === 'non_2xx') {
    exceptionMessage = providerError ? `OAuth token exchange failed: ${providerError}` : 'OAuth token exchange failed.';
  } else if (logVariant === 'inline_error') {
    exceptionMessage = `OAuth token exchange failed: ${providerError}`;
  } else {
    exceptionMessage = 'OAuth token exchange returned a malformed response.';
  }

  return {
    kind: 'error',
    code,
    message,
    ...(providerError !== undefined ? { providerError } : {}),
    logVariant,
    logMessage: TOKEN_EXCHANGE_ERROR_LOG_MESSAGES[logVariant],
    exceptionMessage,
  };
}

/**
 * Map an upstream OAuth token-exchange error onto our `McpOAuthErrorCode`
 * union. Conservative by default — anything we don't explicitly recognise
 * lands on the generic `mcp_token_exchange_failed` so the dashboard
 * doesn't render misleading copy.
 */
export function mapTokenExchangeErrorCode(statusCode: number, providerError: string | undefined): McpOAuthErrorCode {
  const normalised = providerError?.toLowerCase() ?? '';

  if (normalised === 'access_denied') {
    return 'mcp_user_denied';
  }
  if (normalised === 'application_suspended' || normalised === 'app_blocked') {
    return 'mcp_github_org_block';
  }
  if (statusCode === 403 && normalised.includes('resource not accessible')) {
    return 'mcp_github_org_block';
  }

  return 'mcp_token_exchange_failed';
}

/**
 * Interpret a DCR token-endpoint response (RFC 6749 + GitHub-style 200 + inline `error`).
 */
export function resolveDcrTokenExchangeOutcome(statusCode: number, body: unknown): DcrTokenExchangeOutcome {
  if (statusCode < 200 || statusCode >= 300) {
    const providerError = pickProviderErrorCode(body);
    const mappedCode = mapTokenExchangeErrorCode(statusCode, providerError);

    return buildTokenExchangeErrorOutcome({
      code: mappedCode,
      message: providerError ? `Token exchange failed: ${providerError}` : 'Token exchange failed.',
      providerError,
      logVariant: 'non_2xx',
    });
  }

  const inlineProviderError = pickProviderErrorCode(body);
  if (inlineProviderError) {
    const mappedCode = mapTokenExchangeErrorCode(statusCode, inlineProviderError);

    return buildTokenExchangeErrorOutcome({
      code: mappedCode,
      message: `Token exchange failed: ${inlineProviderError}`,
      providerError: inlineProviderError,
      logVariant: 'inline_error',
    });
  }

  const parsed = parseTokenResponseBody(body);
  if (!parsed) {
    return buildTokenExchangeErrorOutcome({
      code: 'mcp_token_exchange_failed',
      message: 'Token exchange returned a malformed response.',
      logVariant: 'malformed',
    });
  }

  return { kind: 'success', tokens: parsed };
}
