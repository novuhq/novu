import { BadRequestException, Controller, Get, Query, Res } from '@nestjs/common';
import { ApiExcludeController, ApiOperation } from '@nestjs/swagger';
import { ApiRateLimitCategoryEnum } from '@novu/shared';
import { Response } from 'express';

import { ThrottlerCategory } from '../rate-limiting/guards';
import { McpOAuthCallbackCommand } from './usecases/mcp-oauth-callback/mcp-oauth-callback.command';
import { McpOAuthCallback } from './usecases/mcp-oauth-callback/mcp-oauth-callback.usecase';

const SUCCESS_FALLBACK_HTML = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Connection complete</title></head><body><p>Connection complete. You can close this window.</p><script>window.close();</script></body></html>`;
const ERROR_FALLBACK_HTML = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Connection failed</title></head><body><p>Connection failed. You can close this window and try again.</p><script>window.close();</script></body></html>`;

/**
 * Public-facing controller for the Novu-managed MCP OAuth callback.
 *
 * Lives outside `AgentsController` (which is class-level authenticated)
 * because the user is being redirected here from a third-party OAuth
 * provider with no Novu session attached. Trust is established via the
 * signed `state` parameter that we issued in `GenerateMcpOAuthUrl`.
 *
 * Throttled under the CONFIGURATION category so a holder of a still-valid
 * signed state cannot spam this endpoint to flip rows / pollute logs.
 */
@ThrottlerCategory(ApiRateLimitCategoryEnum.CONFIGURATION)
@Controller('/agents/mcp')
@ApiExcludeController()
export class AgentsMcpOAuthController {
  constructor(private readonly mcpOAuthCallbackUsecase: McpOAuthCallback) {}

  @Get('/oauth/callback')
  @ApiOperation({
    summary: 'MCP OAuth callback (Novu-managed mode)',
    description:
      'Handles the redirect from a third-party OAuth provider. Exchanges the authorization code for tokens and persists ' +
      'them on the originating `mcp_connection` row.',
  })
  async getOAuthCallback(
    @Res() res: Response,
    @Query('state') state?: string,
    @Query('code') code?: string,
    @Query('error') error?: string,
    @Query('error_description') errorDescription?: string,
    @Query('iss') iss?: string
  ): Promise<void> {
    if (!state) {
      throw new BadRequestException('Missing required OAuth parameter: state');
    }

    const callbackError = error ? `${error}${errorDescription ? ` - ${errorDescription}` : ''}` : undefined;

    const result = await this.mcpOAuthCallbackUsecase.execute(
      McpOAuthCallbackCommand.create({
        state,
        providerCode: code,
        error: callbackError,
        iss,
      })
    );

    const redirect = buildPostCallbackRedirect(result.status, result.message);

    if (redirect) {
      res.redirect(redirect);

      return;
    }

    // No dashboard redirect URL configured — fall back to a tab-close page
    // that signals success/failure visually.
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'");
    res.send(result.status === 'connected' ? SUCCESS_FALLBACK_HTML : ERROR_FALLBACK_HTML);
  }
}

function buildPostCallbackRedirect(status: 'connected' | 'error', message?: string): string | undefined {
  const base = process.env.DASHBOARD_URL?.replace(/\/$/, '');
  if (!base) return undefined;

  const params = new URLSearchParams({ status });
  if (status === 'error' && message) {
    params.set('reason', message);
  }

  return `${base}/agents/mcp/oauth/result?${params.toString()}`;
}
