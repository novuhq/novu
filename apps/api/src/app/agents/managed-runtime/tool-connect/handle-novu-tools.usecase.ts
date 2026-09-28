import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { AgentMcpServerRepository, McpConnectionRepository, SubscriberRepository } from '@novu/dal';
import { MCP_SERVERS, McpConnectionAuthModeEnum, McpConnectionStatusEnum } from '@novu/shared';
import { AgentConversationService } from '../../conversation-runtime/conversation/agent-conversation.service';
import { HandleAgentReplyCommand } from '../../conversation-runtime/reply/handle-agent-reply/handle-agent-reply.command';
import { HandleAgentReply } from '../../conversation-runtime/reply/handle-agent-reply/handle-agent-reply.usecase';
import { EnsureProviderManagedVaultCommand } from '../../mcp/connections/ensure-provider-managed-vault/ensure-provider-managed-vault.command';
import { EnsureProviderManagedVault } from '../../mcp/connections/ensure-provider-managed-vault/ensure-provider-managed-vault.usecase';
import { McpConnectRedirectService } from '../../mcp/connections/mcp-connect-redirect.service';
import { GenerateMcpOAuthUrlCommand } from '../../mcp/oauth/generate-mcp-oauth-url/generate-mcp-oauth-url.command';
import { GenerateMcpOAuthUrl } from '../../mcp/oauth/generate-mcp-oauth-url/generate-mcp-oauth-url.usecase';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import { ManagedAgentService } from '../managed-agent.service';
import { buildConnectCardDelivery } from './connect-card.builder';
import { HandleNovuToolsCommand, NovuToolsActionEnum } from './handle-novu-tools.command';
import { listOAuthMcps } from './list-oauth-mcps.helper';

@Injectable()
export class HandleNovuTools {
  constructor(
    private readonly subscriberRepository: SubscriberRepository,
    private readonly agentMcpServerRepository: AgentMcpServerRepository,
    private readonly mcpConnectionRepository: McpConnectionRepository,
    private readonly generateMcpOAuthUrl: GenerateMcpOAuthUrl,
    private readonly ensureProviderManagedVault: EnsureProviderManagedVault,
    private readonly mcpConnectRedirect: McpConnectRedirectService,
    private readonly agentConversationService: AgentConversationService,
    private readonly handleAgentReply: HandleAgentReply,
    @Inject(forwardRef(() => ManagedAgentService))
    private readonly managedAgentService: ManagedAgentService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: HandleNovuToolsCommand): Promise<void> {
    try {
      switch (command.action) {
        case NovuToolsActionEnum.ListAvailable:
          await this.handleListAvailable(command);
          break;
        case NovuToolsActionEnum.RequestConnect:
          await this.handleRequestConnect(command);
          break;
        default: {
          const _exhaustive: never = command.action;
          await this.sendToolResult(command, {
            error: `Unknown action: ${_exhaustive}`,
          });
        }
      }
    } catch (err) {
      // A managed session is parked on `requires_action` until this custom tool
      // call is answered. If dispatch throws (e.g. a provider-managed vault or
      // OAuth discovery failure) and we never post a result, the session hangs
      // on "Thinking…" forever. Always resolve the tool call with an error so
      // the turn can end and the agent can tell the user.
      this.logger.error(
        {
          err: err instanceof Error ? err.message : String(err),
          action: command.action,
          mcpId: command.mcpId,
          toolUseId: command.toolUseId,
          conversationId: command.conversationId,
        },
        'novu_tool_catalog dispatch failed; posting error tool result to unpark the session'
      );

      await this.sendToolResult(command, {
        error: 'Could not complete this request right now. Please try again.',
      }).catch((resultErr) =>
        this.logger.error(
          {
            err: resultErr instanceof Error ? resultErr.message : String(resultErr),
            toolUseId: command.toolUseId,
          },
          'Failed to post error tool result after novu_tool_catalog dispatch failure'
        )
      );
    }
  }

  private async handleListAvailable(command: HandleNovuToolsCommand): Promise<void> {
    const mcps = await listOAuthMcps(
      {
        subscriberRepository: this.subscriberRepository,
        agentMcpServerRepository: this.agentMcpServerRepository,
        mcpConnectionRepository: this.mcpConnectionRepository,
      },
      {
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        agentId: command.agentId,
        subscriberId: command.subscriberId,
      }
    );

    const unconnected = mcps.filter((mcp) => mcp.status !== McpConnectionStatusEnum.Connected);

    if (unconnected.length === 0) {
      await this.sendToolResult(command, {
        available: [],
        instruction:
          'All integrations are already connected. Proceed to use MCP tools directly without any commentary.',
      });

      return;
    }

    const available = unconnected.map((mcp) => ({
      id: mcp.mcpId,
      name: mcp.name,
      description: MCP_SERVERS.find((s) => s.id === mcp.mcpId)?.description ?? '',
    }));

    await this.sendToolResult(command, {
      available,
      instruction: 'Immediately call novu_tool_catalog with request_connect for the relevant service. Do not narrate.',
    });
  }

  private async handleRequestConnect(command: HandleNovuToolsCommand): Promise<void> {
    if (!command.mcpId) {
      await this.sendToolResult(command, {
        error: 'mcp_id is required for request_connect',
      });

      return;
    }

    const mcp = MCP_SERVERS.find((s) => s.id === command.mcpId);
    const mcpName = mcp?.name ?? command.mcpId;
    const { authorizeUrl, authorizeUrlWithAutoApprove } = await this.resolveConnectUrls(
      command,
      command.mcpId,
      mcp?.oauth?.mode
    );

    if (command.platform === AgentPlatformEnum.WEB_CHAT) {
      const conversation = await this.agentConversationService.getConversation(
        command.conversationId,
        command.environmentId,
        command.organizationId
      );
      if (!conversation) {
        throw new Error(`Conversation ${command.conversationId} not found`);
      }

      await this.agentConversationService.persistMcpConnectionRequest({
        conversationId: command.conversationId,
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        agentIdentifier: command.agentIdentifier,
        channel: this.agentConversationService.getPrimaryChannel(conversation),
        actionId: command.toolUseId,
        mcpId: command.mcpId,
        displayName: mcpName,
        authorizeUrl,
        authorizeUrlWithAutoApprove,
      });

      return;
    }

    const delivery = await buildConnectCardDelivery(
      {
        platform: command.platform,
        mcpId: command.mcpId,
        mcpName,
        authorizeUrl,
        authorizeUrlWithAutoApprove,
      },
      { connectRedirect: this.mcpConnectRedirect }
    );

    const sent = await this.handleAgentReply.execute(
      HandleAgentReplyCommand.create({
        userId: command.organizationId,
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        conversationId: command.conversationId,
        agentIdentifier: command.agentIdentifier,
        integrationIdentifier: command.integrationIdentifier,
        reply: delivery.content,
        slackNative: delivery.slackNative,
      })
    );

    if (sent?.messageId) {
      this.persistConnectCardId(command, sent.messageId).catch((err) =>
        this.logger.warn(err, 'Failed to persist connect card message ID')
      );
    }
  }

  /**
   * Resolve the Connect (and optional auto-approve) URLs for the setup card,
   * branching on the catalog auth mode:
   *
   * - `provider-managed` (Slack, Google Calendar, …): Novu never speaks OAuth
   *   for these — Claude owns the credential in its vault. Provision (or reuse)
   *   the provider vault and hand back the signed "Connect from provider" link,
   *   which flips the row to `connected` and resolves the parked tool call when
   *   the user clicks it. No auto-approve variant exists for this mode.
   * - everything else (`dcr` / `novu-app`, or an unknown id): Novu-brokered
   *   OAuth. Unknown ids fall through here and surface as a discovery error,
   *   which `execute` turns into an error tool result instead of a hang.
   */
  private async resolveConnectUrls(
    command: HandleNovuToolsCommand,
    mcpId: string,
    mode: McpConnectionAuthModeEnum | undefined
  ): Promise<{ authorizeUrl: string; authorizeUrlWithAutoApprove?: string }> {
    if (mode === McpConnectionAuthModeEnum.ProviderManaged) {
      const { vaultUrl } = await this.ensureProviderManagedVault.executeForSetupCard(
        EnsureProviderManagedVaultCommand.create({
          userId: command.organizationId,
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          agentIdentifier: command.agentIdentifier,
          mcpId,
          subscriberId: command.subscriberId,
          conversationId: command.conversationId,
          toolUseId: command.toolUseId,
          integrationIdentifier: command.integrationIdentifier,
          platform: command.platform,
          platformThreadId: command.platformThreadId,
        })
      );

      return { authorizeUrl: vaultUrl };
    }

    const oauthUrls = await this.generateMcpOAuthUrl.executeForSetupCard(
      GenerateMcpOAuthUrlCommand.create({
        userId: command.organizationId,
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        agentIdentifier: command.agentIdentifier,
        mcpId,
        subscriberId: command.subscriberId,
        conversationId: command.conversationId,
        source: 'user_chat',
        toolUseId: command.toolUseId,
        integrationIdentifier: command.integrationIdentifier,
        platform: command.platform,
        platformThreadId: command.platformThreadId,
      })
    );

    return {
      authorizeUrl: oauthUrls.authorizeUrl,
      authorizeUrlWithAutoApprove: oauthUrls.authorizeUrlWithAutoApprove,
    };
  }

  private async persistConnectCardId(command: HandleNovuToolsCommand, cardMessageId: string): Promise<void> {
    const subscriber = await this.subscriberRepository.findBySubscriberId(command.environmentId, command.subscriberId);

    if (!subscriber) return;

    const enablement = (
      await this.agentMcpServerRepository.findOAuthEnablementsForAgent({
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        agentId: command.agentId,
      })
    ).find((row) => row.mcpId === command.mcpId);

    if (!enablement) return;

    await this.mcpConnectionRepository.update(
      {
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        _agentMcpServerId: enablement._id,
        _subscriberId: subscriber._id,
      },
      {
        $set: {
          'oauthState.connectCardMessageId': cardMessageId,
          'oauthState.connectCardPlatform': command.platform,
          'oauthState.connectCardThreadId': command.platformThreadId,
        },
      }
    );
  }

  private async sendToolResult(command: HandleNovuToolsCommand, content: Record<string, unknown>): Promise<void> {
    await this.managedAgentService.sendToolResult({
      conversationId: command.conversationId,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      agentIdentifier: command.agentIdentifier,
      integrationIdentifier: command.integrationIdentifier,
      subscriberId: command.subscriberId,
      toolUseId: command.toolUseId,
      content: JSON.stringify(content),
      platform: command.platform,
      platformThreadId: command.platformThreadId,
    });
  }
}
