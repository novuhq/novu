import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiExcludeController, ApiOperation } from '@nestjs/swagger';
import { AgentRepository, AgentRuntimeEnum } from '@novu/dal';
import { SubscriberSession } from '../shared/framework/user.decorator';
import { isMcpCatalogId, MCP_CATALOG } from './runtimes/mcp-catalog';
import { McpOauthSigningService } from './services/mcp-oauth-signing.service';
import { DisconnectSubscriberMcpCommand } from './usecases/disconnect-subscriber-mcp/disconnect-subscriber-mcp.command';
import { DisconnectSubscriberMcp } from './usecases/disconnect-subscriber-mcp/disconnect-subscriber-mcp.usecase';
import { ListSubscriberMcpConnectionsCommand } from './usecases/list-subscriber-mcp-connections/list-subscriber-mcp-connections.command';
import {
  ListSubscriberMcpConnections,
  type ListSubscriberMcpConnectionsResponse,
} from './usecases/list-subscriber-mcp-connections/list-subscriber-mcp-connections.usecase';

interface IssueConnectLinkResponse {
  url: string;
  expiresAt: string;
}

const TTL_MS = 10 * 60 * 1000;

/**
 * Subscriber-scoped management surface for the per-subscriber MCP connections of an
 * agent. Authenticated via the inbox `subscriberJwt` so subscribers can pre-connect
 * or revoke without involving an admin.
 */
@Controller('/agents')
@ApiExcludeController()
export class AgentsMcpSubscriberController {
  constructor(
    private readonly listConnectionsUsecase: ListSubscriberMcpConnections,
    private readonly disconnectUsecase: DisconnectSubscriberMcp,
    private readonly signingService: McpOauthSigningService,
    private readonly agentRepository: AgentRepository
  ) {}

  @UseGuards(AuthGuard('subscriberJwt'))
  @Get('/:identifier/mcp/connections/me')
  @ApiOperation({ summary: "List the current subscriber's MCP connections for an agent" })
  async listMine(
    @SubscriberSession() session: SubscriberSession,
    @Param('identifier') agentIdentifier: string
  ): Promise<ListSubscriberMcpConnectionsResponse> {
    return this.listConnectionsUsecase.execute(
      ListSubscriberMcpConnectionsCommand.create({
        organizationId: session._organizationId,
        environmentId: session._environmentId,
        agentIdentifier,
        subscriberId: session.subscriberId,
      })
    );
  }

  @UseGuards(AuthGuard('subscriberJwt'))
  @Post('/:identifier/mcp/connections/me/:mcpServerName/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Issue a signed OAuth connect link for the current subscriber' })
  async startConnect(
    @SubscriberSession() session: SubscriberSession,
    @Param('identifier') agentIdentifier: string,
    @Param('mcpServerName') mcpServerName: string
  ): Promise<IssueConnectLinkResponse> {
    if (!isMcpCatalogId(mcpServerName)) {
      throw new NotFoundException(`Unknown MCP server "${mcpServerName}".`);
    }
    const entry = MCP_CATALOG[mcpServerName];
    if (entry.authType !== 'oauth' || !entry.oauth) {
      throw new NotFoundException(`MCP server "${mcpServerName}" does not support OAuth.`);
    }

    const agent = await this.agentRepository.findOne(
      {
        identifier: agentIdentifier,
        _environmentId: session._environmentId,
        _organizationId: session._organizationId,
      },
      ['_id', 'runtime']
    );
    if (!agent) {
      throw new NotFoundException(`Agent with identifier "${agentIdentifier}" was not found.`);
    }
    if ((agent.runtime ?? AgentRuntimeEnum.BRIDGE) !== AgentRuntimeEnum.CLAUDE_MANAGED) {
      throw new NotFoundException(`Agent "${agentIdentifier}" does not use Claude Managed runtime.`);
    }

    const issuedAt = Date.now();
    const token = this.signingService.signPayload({
      organizationId: session._organizationId,
      environmentId: session._environmentId,
      subscriberId: session.subscriberId,
      agentId: agent._id,
      agentIdentifier,
      // Subscribers initiating connection from the dashboard don't have a
      // conversation context; downstream code only logs this so empty is fine.
      conversationId: '',
      mcpServerName,
      issuedAt,
      nonce: this.signingService.newNonce(),
    });

    const apiRootUrl = (process.env.API_ROOT_URL || 'http://localhost:3000').replace(/\/$/, '');
    const url = `${apiRootUrl}/v1/agents/${encodeURIComponent(agentIdentifier)}/mcp/oauth/start?token=${encodeURIComponent(token)}`;

    return { url, expiresAt: new Date(issuedAt + TTL_MS).toISOString() };
  }

  @UseGuards(AuthGuard('subscriberJwt'))
  @Delete('/:identifier/mcp/connections/me/:mcpServerName')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Disconnect an MCP server for the current subscriber' })
  async disconnect(
    @SubscriberSession() session: SubscriberSession,
    @Param('identifier') agentIdentifier: string,
    @Param('mcpServerName') mcpServerName: string
  ): Promise<void> {
    await this.disconnectUsecase.execute(
      DisconnectSubscriberMcpCommand.create({
        organizationId: session._organizationId,
        environmentId: session._environmentId,
        agentIdentifier,
        subscriberId: session.subscriberId,
        mcpServerName,
      })
    );
  }
}
