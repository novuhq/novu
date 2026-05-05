import { BadRequestException, Controller, Get, NotFoundException, Param, Query, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { PinoLogger } from '@novu/application-generic';
import { Response } from 'express';
import { isMcpCatalogId, MCP_CATALOG } from './runtimes/mcp-catalog';
import { AnthropicAgentCredentialsService } from './services/anthropic-agent-credentials.service';
import { McpOauthExchangeService } from './services/mcp-oauth-exchange.service';
import { McpOauthSigningService, type OauthConnectPayload } from './services/mcp-oauth-signing.service';
import { SubscriberAnthropicVaultService } from './services/subscriber-anthropic-vault.service';

const STATE_PARAM = 'state';
const TOKEN_PARAM = 'token';

/**
 * Public-facing OAuth surface for the per-subscriber MCP connect flow. Routes here
 * intentionally don't require Novu auth — the signed `token`/`state` query
 * parameters carry all trust. See {@link McpOauthSigningService}.
 */
@Controller('/agents')
@ApiExcludeController()
export class AgentsMcpOauthController {
  constructor(
    private readonly signingService: McpOauthSigningService,
    private readonly exchangeService: McpOauthExchangeService,
    private readonly credentialsService: AnthropicAgentCredentialsService,
    private readonly subscriberVaultService: SubscriberAnthropicVaultService,
    private readonly logger: PinoLogger
  ) {}

  @Get('/:identifier/mcp/oauth/start')
  async start(
    @Param('identifier') agentIdentifier: string,
    @Query(TOKEN_PARAM) token: string,
    @Res() res: Response
  ): Promise<void> {
    if (!token) {
      throw new BadRequestException('Missing token.');
    }

    const payload = this.signingService.verifyPayload(token);
    if (payload.agentIdentifier !== agentIdentifier) {
      throw new BadRequestException('Token agent mismatch.');
    }

    const entry = MCP_CATALOG[payload.mcpServerName as keyof typeof MCP_CATALOG];
    if (!entry?.oauth) {
      throw new NotFoundException(`MCP server "${payload.mcpServerName}" does not support OAuth.`);
    }

    const creds = this.exchangeService.getClientCredentials(entry.oauth.provider);
    if (!creds) {
      throw new NotFoundException(`OAuth client credentials for "${entry.oauth.provider}" are not configured.`);
    }

    const redirectUri = this.buildCallbackUrl();
    const authorizeUrl = this.exchangeService.buildAuthorizeUrl({ entry, creds, redirectUri, state: token });

    res.redirect(302, authorizeUrl);
  }

  @Get('/mcp/oauth/callback')
  async callback(
    @Query(STATE_PARAM) state: string,
    @Query('code') code: string,
    @Query('error') error: string | undefined,
    @Res() res: Response
  ): Promise<void> {
    if (error) {
      this.logger.warn({ error }, 'MCP OAuth callback received error from provider');
      res.status(400).type('html').send(this.renderErrorPage(error));

      return;
    }

    if (!state || !code) {
      throw new BadRequestException('Missing state or code parameter.');
    }

    const payload = this.signingService.verifyPayload(state);

    if (!isMcpCatalogId(payload.mcpServerName)) {
      throw new BadRequestException(`Unknown MCP server "${payload.mcpServerName}".`);
    }
    const entry = MCP_CATALOG[payload.mcpServerName];
    if (!entry.oauth) {
      throw new BadRequestException(`MCP server "${payload.mcpServerName}" does not use OAuth.`);
    }

    const creds = this.exchangeService.getClientCredentials(entry.oauth.provider);
    if (!creds) {
      throw new NotFoundException(`OAuth client credentials for "${entry.oauth.provider}" are not configured.`);
    }

    const apiKey = await this.credentialsService.getApiKey(payload.organizationId, payload.environmentId);

    const redirectUri = this.buildCallbackUrl();
    const tokenResult = await this.exchangeService.exchangeCode({
      oauth: entry.oauth,
      creds,
      redirectUri,
      code,
    });

    await this.subscriberVaultService.setOAuthCredential({
      organizationId: payload.organizationId,
      environmentId: payload.environmentId,
      subscriberId: payload.subscriberId,
      agentId: payload.agentId,
      apiKey,
      mcpServerName: payload.mcpServerName,
      mcpServerUrl: entry.url,
      accessToken: tokenResult.accessToken,
      expiresAt: tokenResult.expiresAt,
      refresh: tokenResult.refreshToken
        ? {
            clientId: creds.clientId,
            refreshToken: tokenResult.refreshToken,
            tokenEndpoint: entry.oauth.tokenUrl,
            tokenEndpointAuth:
              entry.oauth.tokenEndpointAuthMethod === 'client_secret_basic'
                ? { type: 'client_secret_basic', clientSecret: creds.clientSecret }
                : { type: 'client_secret_post', clientSecret: creds.clientSecret },
            scope: tokenResult.scope ?? entry.oauth.scopes?.join(' '),
          }
        : undefined,
    });

    res.status(200).type('html').send(this.renderSuccessPage(entry.displayName, payload));
  }

  private buildCallbackUrl(): string {
    const apiRootUrl = (process.env.API_ROOT_URL || 'http://localhost:3000').replace(/\/$/, '');

    return `${apiRootUrl}/v1/agents/mcp/oauth/callback`;
  }

  private renderSuccessPage(displayName: string, payload: OauthConnectPayload): string {
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Connected to ${escapeHtml(displayName)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  body { font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; background: #fafafa; color: #1a1a1a; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
  .card { background: #fff; padding: 32px 28px; border-radius: 12px; box-shadow: 0 6px 32px rgba(0,0,0,0.06); text-align: center; max-width: 360px; }
  .icon { font-size: 36px; line-height: 1; margin-bottom: 12px; }
  h1 { font-size: 18px; margin: 0 0 6px; }
  p { color: #4a4a4a; margin: 0 0 12px; }
  small { color: #8a8a8a; }
</style>
</head>
<body>
<div class="card">
  <div class="icon">✓</div>
  <h1>Connected to ${escapeHtml(displayName)}</h1>
  <p>Head back to your conversation and ask Claude again.</p>
  <small>Conversation ${escapeHtml(payload.conversationId)}</small>
</div>
<script>setTimeout(() => window.close(), 1500);</script>
</body>
</html>`;
  }

  private renderErrorPage(error: string): string {
    return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8" /><title>Connection failed</title></head>
<body style="font: 14px/1.5 -apple-system, sans-serif; padding: 32px;">
<h1 style="font-size: 18px;">Connection failed</h1>
<p>${escapeHtml(error)}</p>
<p>Close this tab and ask Claude to send a new connect link.</p>
</body>
</html>`;
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
