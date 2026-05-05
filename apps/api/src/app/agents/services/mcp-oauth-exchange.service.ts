import { BadGatewayException, Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import type { McpCatalogEntry, McpCatalogOauthConfig } from '../runtimes/mcp-catalog';

export interface McpOauthClientCredentials {
  clientId: string;
  clientSecret: string;
}

export interface McpOauthTokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scope?: string;
}

/**
 * Per-provider OAuth utilities — reads `NOVU_MCP_OAUTH_<PROVIDER>_CLIENT_ID/SECRET`
 * from the environment and performs the authorization-code → token exchange.
 */
@Injectable()
export class McpOauthExchangeService {
  constructor(private readonly logger: PinoLogger) {}

  getClientCredentials(provider: string): McpOauthClientCredentials | undefined {
    const upper = provider.toUpperCase().replace(/[^A-Z0-9]/g, '_');
    const clientId = process.env[`NOVU_MCP_OAUTH_${upper}_CLIENT_ID`];
    const clientSecret = process.env[`NOVU_MCP_OAUTH_${upper}_CLIENT_SECRET`];
    if (!clientId || !clientSecret) {
      return undefined;
    }

    return { clientId, clientSecret };
  }

  buildAuthorizeUrl(params: {
    entry: McpCatalogEntry;
    creds: McpOauthClientCredentials;
    redirectUri: string;
    state: string;
  }): string {
    const { entry, creds, redirectUri, state } = params;
    if (!entry.oauth) {
      throw new Error('Catalog entry has no OAuth config.');
    }

    const url = new URL(entry.oauth.authorizeUrl);
    url.searchParams.set('client_id', creds.clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('state', state);
    if (entry.oauth.scopes?.length) {
      url.searchParams.set('scope', entry.oauth.scopes.join(' '));
    }

    return url.toString();
  }

  async exchangeCode(params: {
    oauth: McpCatalogOauthConfig;
    creds: McpOauthClientCredentials;
    redirectUri: string;
    code: string;
  }): Promise<McpOauthTokenResponse> {
    const body = new URLSearchParams();
    body.set('grant_type', 'authorization_code');
    body.set('code', params.code);
    body.set('redirect_uri', params.redirectUri);

    // GitHub (and a few other providers) return form-encoded by default; explicitly
    // ask for JSON to keep the parsing path simple, but also fall back to parsing
    // x-www-form-urlencoded below in case a provider ignores the header.
    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    };
    if (params.oauth.tokenEndpointAuthMethod === 'client_secret_basic') {
      const basic = Buffer.from(`${params.creds.clientId}:${params.creds.clientSecret}`).toString('base64');
      headers.Authorization = `Basic ${basic}`;
    } else {
      body.set('client_id', params.creds.clientId);
      body.set('client_secret', params.creds.clientSecret);
    }

    const response = await fetch(params.oauth.tokenUrl, {
      method: 'POST',
      headers,
      body: body.toString(),
    });

    const text = await response.text();
    if (!response.ok) {
      this.logger.warn(
        { status: response.status, body: text.slice(0, 256), provider: params.oauth.provider },
        'OAuth token exchange failed'
      );
      throw new BadGatewayException(`OAuth token exchange failed for ${params.oauth.provider}.`);
    }

    const contentType = response.headers.get('content-type') ?? '';
    const payload = parseTokenResponse(text, contentType);

    if (!payload) {
      this.logger.warn(
        { contentType, body: text.slice(0, 256), provider: params.oauth.provider },
        'OAuth token endpoint returned an unparseable body'
      );
      throw new BadGatewayException(`OAuth token endpoint returned an unparseable body for ${params.oauth.provider}.`);
    }

    // Some providers (notably GitHub) return 200 with `error=...` when the code is
    // invalid/expired. Surface that as a clear 502 rather than the generic
    // "missing access_token" further down.
    if (typeof payload.error === 'string') {
      const description = typeof payload.error_description === 'string' ? payload.error_description : payload.error;
      this.logger.warn(
        { provider: params.oauth.provider, error: payload.error, description },
        'OAuth token exchange returned an error payload'
      );
      throw new BadGatewayException(`OAuth token exchange failed for ${params.oauth.provider}: ${description}`);
    }

    const accessToken = typeof payload.access_token === 'string' ? payload.access_token : undefined;
    if (!accessToken) {
      throw new BadGatewayException(`OAuth token endpoint did not return access_token for ${params.oauth.provider}.`);
    }

    const refreshToken = typeof payload.refresh_token === 'string' ? payload.refresh_token : undefined;
    const expiresInRaw = payload.expires_in;
    const expiresIn =
      typeof expiresInRaw === 'number'
        ? expiresInRaw
        : typeof expiresInRaw === 'string' && /^\d+$/.test(expiresInRaw)
          ? Number(expiresInRaw)
          : undefined;
    const scope = typeof payload.scope === 'string' ? payload.scope : undefined;

    return {
      accessToken,
      refreshToken,
      expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : undefined,
      scope,
    };
  }
}

/**
 * Parse a token response body. Tries JSON first (per `Accept: application/json`),
 * falls back to `application/x-www-form-urlencoded` because GitHub historically
 * returns the latter even when JSON is requested through the wrong client.
 */
function parseTokenResponse(text: string, contentType: string): Record<string, unknown> | undefined {
  const trimmed = text.trim();
  if (!trimmed) return undefined;

  if (contentType.includes('application/json') || trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      // fall through to form parsing
    }
  }

  if (contentType.includes('application/x-www-form-urlencoded') || trimmed.includes('=')) {
    try {
      const params = new URLSearchParams(trimmed);
      const payload: Record<string, unknown> = {};
      for (const [key, value] of params.entries()) {
        payload[key] = value;
      }

      return Object.keys(payload).length > 0 ? payload : undefined;
    } catch {
      return undefined;
    }
  }

  return undefined;
}
