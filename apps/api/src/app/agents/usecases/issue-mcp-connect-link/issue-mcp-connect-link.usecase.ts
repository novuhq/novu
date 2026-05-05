import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AgentRepository, AgentRuntimeEnum } from '@novu/dal';
import { isMcpCatalogId, MCP_CATALOG } from '../../runtimes/mcp-catalog';
import { McpOauthSigningService } from '../../services/mcp-oauth-signing.service';
import { IssueMcpConnectLinkCommand } from './issue-mcp-connect-link.command';

export interface IssueMcpConnectLinkResponse {
  url: string;
  /** Same TTL window the worker should respect when posting the message. */
  expiresAt: string;
}

const TTL_MS = 10 * 60 * 1000;

/**
 * Generates a signed connect URL the worker can DM to a subscriber when Anthropic
 * surfaces an MCP authentication failure. The link encodes everything the OAuth
 * start endpoint needs to redirect to the provider.
 */
@Injectable()
export class IssueMcpConnectLink {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly signingService: McpOauthSigningService
  ) {}

  async execute(command: IssueMcpConnectLinkCommand): Promise<IssueMcpConnectLinkResponse> {
    if (!isMcpCatalogId(command.mcpServerName)) {
      throw new BadRequestException(`Unknown MCP catalog id "${command.mcpServerName}".`);
    }
    const entry = MCP_CATALOG[command.mcpServerName];
    if (entry.authType !== 'oauth' || !entry.oauth) {
      throw new BadRequestException(`MCP server "${command.mcpServerName}" does not use OAuth.`);
    }

    const agent = await this.agentRepository.findOne(
      {
        identifier: command.agentIdentifier,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      ['_id', 'runtime']
    );

    if (!agent) {
      throw new NotFoundException(`Agent with identifier "${command.agentIdentifier}" was not found.`);
    }
    if ((agent.runtime ?? AgentRuntimeEnum.BRIDGE) !== AgentRuntimeEnum.CLAUDE_MANAGED) {
      throw new BadRequestException('Agent is not configured for Claude Managed Agents.');
    }

    const issuedAt = Date.now();
    const token = this.signingService.signPayload({
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      subscriberId: command.subscriberId,
      agentId: agent._id,
      agentIdentifier: command.agentIdentifier,
      conversationId: command.conversationId,
      mcpServerName: command.mcpServerName,
      issuedAt,
      nonce: this.signingService.newNonce(),
    });

    const apiRootUrl = (process.env.API_ROOT_URL || 'http://localhost:3000').replace(/\/$/, '');
    const url = `${apiRootUrl}/v1/agents/${encodeURIComponent(command.agentIdentifier)}/mcp/oauth/start?token=${encodeURIComponent(token)}`;

    return {
      url,
      expiresAt: new Date(issuedAt + TTL_MS).toISOString(),
    };
  }
}
