import { BadRequestException, Controller, Get, HttpStatus, NotFoundException, Query, Res } from '@nestjs/common';
import { ApiExcludeController, ApiOperation } from '@nestjs/swagger';
import { ApiRateLimitCategoryEnum } from '@novu/shared';
import { Response } from 'express';

import { ThrottlerCategory } from '../../../rate-limiting/guards';
import { CONNECTION_RESULT_CSP, renderConnectionResultPage } from '../../../shared/html/connection-result-page';
import { CompleteProviderManagedRedirect } from '../connections/ensure-provider-managed-vault/complete-provider-managed-redirect.usecase';
import { PROVIDER_MANAGED_REDIRECT_PATH } from '../connections/ensure-provider-managed-vault/provider-managed-redirect-state';
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
  constructor(
    private readonly mcpOAuthCallbackUsecase: McpOAuthCallback,
    private readonly completeProviderManagedRedirect: CompleteProviderManagedRedirect
  ) {}

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
    // dashboard. The shared renderer tells the user they can close the tab.
    // so the message stays short and avoids repeating it. Openers detect the
    // outcome via popup-close detection / status polling, not from this page.
    const isConnected = result.status === 'connected';
    const page = isConnected
      ? renderConnectionResultPage({
          status: 'success',
          title: 'Connection complete',
          heading: "You're all set",
          message: 'Your MCP server is connected and ready to use.',
        })
      : renderConnectionResultPage({
          status: 'error',
          title: 'Connection failed',
          heading: "We couldn't connect",
          message: 'Something went wrong while connecting your MCP server. Please go back and try again.',
        });

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Security-Policy', CONNECTION_RESULT_CSP);
    res.send(page);
  }

  /**
   * Intercept the in-channel "Connect from provider" link and 302 the user
   * to the provider's vault UI to finish OAuth. Trust is established via the
   * signed `state` parameter issued by `EnsureProviderManagedVault.executeForSetupCard`.
   *
   * The connection row is promoted to `connected` fire-and-forget after the
   * redirect is sent so the browser does not wait on DB writes or Slack API calls.
   */
  @Get('/provider-managed/redirect')
  @ApiOperation({
    summary: 'Provider-managed MCP connect redirect',
    description:
      'Marks the provider-managed connection row as connected and 302-redirects to the provider vault UI ' +
      'where OAuth completes. Mounted under the same public controller as the OAuth callback because ' +
      `${PROVIDER_MANAGED_REDIRECT_PATH} is hit by an unauthenticated browser tab opened from a Slack/Teams card.`,
  })
  async getProviderManagedRedirect(@Res() res: Response, @Query('state') state?: string): Promise<void> {
    if (!state) {
      throw new BadRequestException('Missing required redirect parameter: state');
    }

    try {
      const result = await this.completeProviderManagedRedirect.execute(state);

      res.redirect(HttpStatus.FOUND, result.redirectUrl);
    } catch (err) {
      const isExpired =
        err instanceof BadRequestException &&
        typeof err.message === 'string' &&
        err.message.includes('redirect state expired');
      const isNotFound = err instanceof NotFoundException;

      let title = 'Connection failed';
      let heading = "We couldn't connect";
      let message =
        'Something went wrong while opening the provider connection. Send a new message to your agent and try again.';

      if (isExpired) {
        title = 'Link expired';
        heading = 'This link has expired';
        message =
          'This setup link is no longer valid. Send a new message to your agent to get a fresh Connect from provider link.';
      } else if (isNotFound) {
        message =
          'The connection or environment for this link no longer exists. Send a new message to your agent to restart setup.';
      }

      const page = renderConnectionResultPage({
        status: 'error',
        title,
        heading,
        message,
      });

      res.status(HttpStatus.OK);
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Security-Policy', CONNECTION_RESULT_CSP);
      res.send(page);
    }
  }
}
