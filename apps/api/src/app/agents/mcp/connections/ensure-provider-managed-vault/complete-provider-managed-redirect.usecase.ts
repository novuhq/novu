import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, PinoLogger } from '@novu/application-generic';
import { EnvironmentRepository, McpConnectionEntity, McpConnectionRepository } from '@novu/dal';
import { buildClaudePlatformVaultUrl, MCP_SERVERS, McpConnectionStatusEnum } from '@novu/shared';

import { areHexDigestsEqual } from '../../../../shared/helpers/timing-safe-equal';
import { OutboundGateway } from '../../../conversation-runtime/egress/outbound.gateway';
import { ManagedAgentService } from '../../../managed-runtime/managed-agent.service';
import { AgentPlatformEnum } from '../../../shared/enums/agent-platform.enum';
import {
  decodeProviderManagedRedirectState,
  PROVIDER_MANAGED_REDIRECT_TTL_MS,
  type ProviderManagedRedirectState,
} from './provider-managed-redirect-state';

export interface CompleteProviderManagedRedirectResult {
  /** Final URL to 302 the user to — the provider's vault UI where OAuth completes. */
  redirectUrl: string;
}

/**
 * Handle the click on an in-channel "Connect from provider" link.
 *
 * Provider-managed MCPs have no Novu OAuth callback because Claude owns the
 * credential entirely. The row is promoted to `connected` here so the MCP
 * server is offered to the next turn (`resolveConnectedMcps` gates the per-turn
 * server list on `connected`). This is optimistic: the user still has to finish
 * OAuth in Claude's vault, and we cannot observe that completion. So we do NOT
 * claim success — the setup card is edited to a "finalizing" note and the agent
 * is told not to announce the connection. If the vault ends up empty, Claude's
 * next MCP init emits `mcp-server-failure` and `McpConnectionErrorHandler`
 * flips the row back to `error` and notifies the user.
 *
 * The signed `state` parameter is the trust boundary; we verify it against the
 * originating environment's API key so unauthenticated traffic to this endpoint
 * cannot flip arbitrary rows. The 302 is sent as soon as validation passes; the
 * side effects run fire-and-forget so the browser does not wait on Slack calls.
 */
@Injectable()
export class CompleteProviderManagedRedirect {
  constructor(
    private readonly mcpConnectionRepository: McpConnectionRepository,
    private readonly environmentRepository: EnvironmentRepository,
    private readonly managedAgentService: ManagedAgentService,
    private readonly outboundGateway: OutboundGateway,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(CompleteProviderManagedRedirect.name);
  }

  async execute(state: string): Promise<CompleteProviderManagedRedirectResult> {
    const { payload, rawPayload, signature } = decodeProviderManagedRedirectState(state);

    const environment = await this.environmentRepository.findOne(
      { _id: payload.environmentId, _organizationId: payload.organizationId },
      ['apiKeys']
    );

    if (!environment?.apiKeys?.length) {
      throw new NotFoundException('Environment for redirect state not found or has no API keys.');
    }

    const isValidSignature = environment.apiKeys.some(({ key }) =>
      areHexDigestsEqual(createHash(key, rawPayload), signature)
    );
    if (!isValidSignature) {
      throw new BadRequestException('Provider-managed redirect signature mismatch.');
    }

    if (Date.now() - payload.timestamp > PROVIDER_MANAGED_REDIRECT_TTL_MS) {
      throw new BadRequestException('Provider-managed redirect state expired. Restart the setup flow.');
    }

    const connection = await this.mcpConnectionRepository.findOne(
      {
        _id: payload.connectionId,
        _environmentId: payload.environmentId,
        _organizationId: payload.organizationId,
      },
      // `oauthState` carries the connect-card coordinates the setup-card flow
      // persisted, so we can tear the card down once the MCP is connected.
      ['_id', 'oauthState']
    );

    if (!connection) {
      throw new NotFoundException('Provider-managed connection row not found.');
    }

    const redirectUrl = buildClaudePlatformVaultUrl(payload.externalVaultId, payload.externalWorkspaceId);

    void this.runPostRedirectSideEffects(payload, connection).catch((err) =>
      this.logger.warn(
        {
          err: err instanceof Error ? err.message : String(err),
          connectionId: payload.connectionId,
          conversationId: payload.conversationId,
        },
        'Provider-managed redirect post-work failed (non-fatal)'
      )
    );

    return { redirectUrl };
  }

  /**
   * Promote the connection and refresh setup cards / replay parked turns.
   * Runs after the 302 is issued — must not block the redirect response.
   */
  private async runPostRedirectSideEffects(
    payload: ProviderManagedRedirectState,
    connection: Pick<McpConnectionEntity, '_id' | 'oauthState'>
  ): Promise<void> {
    const mcpName = resolveMcpName(payload.mcpId);

    // Edit the card first — it reads `connection.oauthState`, which the update
    // below clears.
    await this.markConnectCardFinalizing(payload, connection.oauthState, mcpName);

    await this.mcpConnectionRepository.update(
      {
        _id: connection._id,
        _environmentId: payload.environmentId,
        _organizationId: payload.organizationId,
      },
      {
        // Optimistic: needed so `resolveConnectedMcps` offers the server on the
        // next turn. A genuinely empty vault is corrected to `error` by
        // `McpConnectionErrorHandler` on the first failed MCP init.
        $set: {
          status: McpConnectionStatusEnum.Connected,
          connectedAt: new Date(),
        },
        $unset: { oauthState: 1, lastError: 1 },
      }
    );

    if (payload.toolUseId && payload.conversationId && payload.platform && payload.platformThreadId) {
      await this.managedAgentService.sendToolResult({
        conversationId: payload.conversationId,
        environmentId: payload.environmentId,
        organizationId: payload.organizationId,
        agentIdentifier: payload.agentIdentifier ?? '',
        integrationIdentifier: payload.integrationIdentifier ?? '',
        subscriberId: payload.subscriberId,
        toolUseId: payload.toolUseId,
        content: `Setup link opened. Do not attempt any MCP tools this turn.`,
        // Deliberately non-committal — OAuth may not be finished in Claude yet,
        // and there is no completion signal we can trust at this point. The
        // running session also won't pick up the new credential (Thalamus binds
        // vault_ids at session creation), so the user must start a new session.
        followUpMessage:
          `${mcpName} setup is being finalized in Claude. Do not tell the user it is already connected. ` +
          `Ask them to approve access in the Claude tab that just opened, then start a new conversation — ` +
          `the tools become available in a new session once approval completes.`,
        platform: payload.platform as AgentPlatformEnum,
        platformThreadId: payload.platformThreadId,
      });
    }
  }

  /**
   * Edit the in-channel "Connect" card to a truthful "finalizing" note instead
   * of deleting it or leaving a live Connect button. We can't confirm the vault
   * OAuth completed, so the card must not imply success.
   *
   * Web chat has no channel message to edit (the pending activity card already
   * reflects the in-progress state), so it is a no-op there. Best-effort — a
   * failure here must never block promotion or session resume.
   */
  private async markConnectCardFinalizing(
    payload: ProviderManagedRedirectState,
    oauthState: McpConnectionEntity['oauthState'],
    mcpName: string
  ): Promise<void> {
    if (payload.platform === AgentPlatformEnum.WEB_CHAT) {
      return;
    }

    const connectCardMessageId = oauthState?.connectCardMessageId;
    const connectCardThreadId = oauthState?.connectCardThreadId;

    if (!connectCardMessageId || !connectCardThreadId || !payload.platform) {
      return;
    }

    await this.outboundGateway
      .editInConversation(
        payload.agentId,
        payload.integrationIdentifier ?? '',
        payload.platform,
        connectCardThreadId,
        connectCardMessageId,
        {
          markdown: `🔄 Finalizing *${mcpName}* setup — approve access in the Claude tab, then start a new conversation to use it.`,
        }
      )
      .catch((err) => this.logger.warn(err, 'Failed to edit provider-managed connect card to finalizing state'));
  }
}

function resolveMcpName(mcpId?: string): string {
  return MCP_SERVERS.find((entry) => entry.id === mcpId)?.name ?? mcpId ?? 'the integration';
}
