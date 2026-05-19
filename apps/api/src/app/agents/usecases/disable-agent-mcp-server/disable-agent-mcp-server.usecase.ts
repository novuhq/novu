import { Injectable, NotFoundException } from '@nestjs/common';
import { AnalyticsService, decryptCredentials, getAgentRuntimeProvider, PinoLogger } from '@novu/application-generic';
import { AgentMcpServerRepository, AgentRepository, IntegrationRepository, McpConnectionRepository } from '@novu/dal';

import { trackAgentMcpServerDisabled } from '../../agent-analytics';
import { SyncAgentMcpServersCommand } from '../sync-agent-mcp-servers/sync-agent-mcp-servers.command';
import { SyncAgentMcpServers } from '../sync-agent-mcp-servers/sync-agent-mcp-servers.usecase';
import { DisableAgentMcpServerCommand } from './disable-agent-mcp-server.command';

/**
 * Disable a catalog MCP on an agent.
 *
 *   1. For runtimes that expose a token vault (`capabilities.tokenVault ===
 *      true`), best-effort delete each stored provider-side credential so a
 *      revoked Novu connection doesn't leave dangling tokens upstream.
 *   2. Cascade-delete every `mcp_connection` row scoped to the
 *      `agent_mcp_server` we are about to remove.
 *   3. Delete the `agent_mcp_server` row.
 *   4. Project the new (smaller) enabled set onto the runtime provider via
 *      `SyncAgentMcpServers`.
 */
@Injectable()
export class DisableAgentMcpServer {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly agentMcpServerRepository: AgentMcpServerRepository,
    private readonly mcpConnectionRepository: McpConnectionRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly syncAgentMcpServers: SyncAgentMcpServers,
    private readonly analyticsService: AnalyticsService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(DisableAgentMcpServer.name);
  }

  async execute(command: DisableAgentMcpServerCommand): Promise<void> {
    const agent = await this.agentRepository.findOne(
      {
        identifier: command.agentIdentifier,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      ['_id', 'runtime', 'managedRuntime']
    );

    if (!agent) {
      throw new NotFoundException(`Agent "${command.agentIdentifier}" not found.`);
    }

    const enablement = await this.agentMcpServerRepository.findByAgentAndMcpId({
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      agentId: agent._id,
      mcpId: command.mcpId,
    });

    if (!enablement) {
      return;
    }

    await this.revokeVaultCredentials({
      command,
      agent,
      agentMcpServerId: enablement._id,
    });

    await this.mcpConnectionRepository.delete({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _agentMcpServerId: enablement._id,
    });

    await this.agentMcpServerRepository.delete({
      _id: enablement._id,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
    });

    await this.syncAgentMcpServers.execute(
      SyncAgentMcpServersCommand.create({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        agentId: agent._id,
      })
    );

    trackAgentMcpServerDisabled(this.analyticsService, {
      userId: command.userId,
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      agentId: agent._id,
      agentIdentifier: command.agentIdentifier,
      mcpId: command.mcpId,
    });
  }

  /**
   * Best-effort revoke of provider-vault credentials before the cascade
   * delete drops them from Mongo. Skips runtimes whose `tokenVault`
   * capability is `false` (in which case Novu was the sole credential
   * store and there's nothing upstream to clean up). Errors are logged but
   * never block the local cleanup — leaving stale tokens in the runtime
   * vault is preferable to leaving an enablement row half-deleted.
   */
  private async revokeVaultCredentials(args: {
    command: DisableAgentMcpServerCommand;
    agent: { runtime?: string; managedRuntime?: { providerId: string; _integrationId: string } };
    agentMcpServerId: string;
  }): Promise<void> {
    const { command, agent, agentMcpServerId } = args;

    if (agent.runtime !== 'managed' || !agent.managedRuntime) {
      return;
    }

    const integration = await this.integrationRepository.findOne(
      {
        _id: agent.managedRuntime._integrationId,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      ['credentials']
    );

    if (!integration?.credentials) {
      return;
    }

    const creds = decryptCredentials(integration.credentials);

    if (!creds.apiKey) {
      return;
    }

    const runtimeProvider = getAgentRuntimeProvider(agent.managedRuntime.providerId, creds.apiKey);

    if (!runtimeProvider.capabilities.tokenVault) {
      return;
    }

    const connections = await this.mcpConnectionRepository.findByAgentMcpServer({
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      agentMcpServerId,
    });

    for (const connection of connections) {
      const vaultCredentialId = connection.auth?.vaultCredentialId;

      if (!vaultCredentialId) {
        continue;
      }

      try {
        await runtimeProvider.deleteVaultCredential({
          integrationCredentials: creds as Record<string, unknown>,
          vaultCredentialId,
        });
      } catch (err) {
        this.logger.warn(
          {
            err: err instanceof Error ? err.message : String(err),
            connectionId: connection._id,
            vaultCredentialId,
          },
          'Best-effort vault credential deletion failed on disable'
        );
      }
    }
  }
}
