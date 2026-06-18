import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { AgentMcpServerRepository, McpConnectionRepository, SubscriberRepository } from '@novu/dal';
import { MCP_SERVERS, McpConnectionStatusEnum } from '@novu/shared';
import { HandleAgentReplyCommand } from '../../conversation-runtime/reply/handle-agent-reply/handle-agent-reply.command';
import { HandleAgentReply } from '../../conversation-runtime/reply/handle-agent-reply/handle-agent-reply.usecase';
import { McpConnectRedirectService } from '../../mcp/connections/mcp-connect-redirect.service';
import { GenerateMcpOAuthUrlCommand } from '../../mcp/oauth/generate-mcp-oauth-url/generate-mcp-oauth-url.command';
import { GenerateMcpOAuthUrl } from '../../mcp/oauth/generate-mcp-oauth-url/generate-mcp-oauth-url.usecase';
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
    private readonly mcpConnectRedirect: McpConnectRedirectService,
    private readonly handleAgentReply: HandleAgentReply,
    @Inject(forwardRef(() => ManagedAgentService))
    private readonly managedAgentService: ManagedAgentService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: HandleNovuToolsCommand): Promise<void> {
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
      instruction: 'Immediately call novu_tools with request_connect for the relevant service. Do not narrate.',
    });
  }

  private async handleRequestConnect(command: HandleNovuToolsCommand): Promise<void> {
    if (!command.mcpId) {
      await this.sendToolResult(command, {
        error: 'mcp_id is required for request_connect',
      });

      return;
    }

    const oauthCommand = GenerateMcpOAuthUrlCommand.create({
      userId: command.organizationId,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      agentIdentifier: command.agentIdentifier,
      mcpId: command.mcpId,
      subscriberId: command.subscriberId,
      conversationId: command.conversationId,
      source: 'user_chat',
      toolUseId: command.toolUseId,
      integrationIdentifier: command.integrationIdentifier,
      platform: command.platform,
      platformThreadId: command.platformThreadId,
    });

    const oauthUrls = await this.generateMcpOAuthUrl.executeForSetupCard(oauthCommand);

    const mcp = MCP_SERVERS.find((s) => s.id === command.mcpId);
    const mcpName = mcp?.name ?? command.mcpId;

    const delivery = await buildConnectCardDelivery(
      {
        platform: command.platform,
        mcpId: command.mcpId,
        mcpName,
        authorizeUrl: oauthUrls.authorizeUrl,
        authorizeUrlWithAutoApprove: oauthUrls.authorizeUrlWithAutoApprove,
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
