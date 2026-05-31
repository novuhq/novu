import { BadRequestException, Controller, Get, Query, Res } from '@nestjs/common';
import { ApiExcludeController, ApiOperation } from '@nestjs/swagger';
import { ApiRateLimitCategoryEnum } from '@novu/shared';
import { Response } from 'express';

import { ThrottlerCategory } from '../../../rate-limiting/guards';
import { renderConnectionResultPage } from '../../../shared/html/connection-result-page';
import { McpOAuthCallbackCommand } from './mcp-oauth-callback/mcp-oauth-callback.command';
import { McpOAuthCallback } from './mcp-oauth-callback/mcp-oauth-callback.usecase';

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

    // Render a self-contained "flow complete" page instead of redirecting to the
    // dashboard. The shared renderer already shows a "Close this tab" action, so
    // the message stays short and avoids repeating it. A best-effort postMessage
    // lets any same-origin opener (e.g. a popup-based flow) auto-detect the outcome.
    const isConnected = result.status === 'connected';
    const page = isConnected
      ? renderConnectionResultPage({
          status: 'success',
          title: 'Connection complete',
          heading: "You're all set",
          message: 'Your MCP server is connected and ready to use.',
          postMessagePayload: { type: 'novu-mcp-oauth-result', status: 'connected' },
        })
      : renderConnectionResultPage({
          status: 'error',
          title: 'Connection failed',
          heading: "We couldn't connect",
          message: 'Something went wrong while connecting your MCP server. Please go back and try again.',
          postMessagePayload: { type: 'novu-mcp-oauth-result', status: 'error', reason: result.message },
        });

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'");
    res.send(page);
  }
}
