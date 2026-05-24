import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { decryptCredentials, getAgentRuntimeProvider, PinoLogger } from '@novu/application-generic';
import { AgentMcpServerRepository, AgentRepository, IntegrationRepository } from '@novu/dal';
import { MCP_SERVERS } from '@novu/shared';

import { projectMcpRowsToCatalog } from '../../utils/project-mcp-servers';
import { SyncAgentMcpServersCommand } from './sync-agent-mcp-servers.command';

/**
 * Push the current Mongo-side enablement list (agent_mcp_server rows) to the
 * runtime provider as `agent.mcp_servers`. Mongo is authoritative — the
 * provider's view becomes a downstream projection.
 *
 * Called by EnableAgentMcpServer / DisableAgentMcpServer after every
 * mutating Mongo write so the projection stays aligned.
 *
 * On provider failure all touched rows are marked `status: 'error'` with a
 * `lastError` payload so the caller can surface it and a retry job can
 * later re-trigger sync. The error is rethrown so the use case's HTTP
 * response also reflects the failure.
 *
 * Self-hosted agents are skipped (no provider to project to).
 */
@Injectable()
export class SyncAgentMcpServers {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly agentMcpServerRepository: AgentMcpServerRepository,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: SyncAgentMcpServersCommand): Promise<void> {
    const agent = await this.agentRepository.findOne(
      {
        _id: command.agentId,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      ['_id', 'runtime', 'managedRuntime']
    );

    if (!agent) {
      throw new NotFoundException(`Agent "${command.agentId}" not found.`);
    }

    if (agent.runtime !== 'managed' || !agent.managedRuntime) {
      return;
    }

    const { providerId, _integrationId, externalAgentId } = agent.managedRuntime;

    const integration = await this.integrationRepository.findOne(
      {
        _id: _integrationId,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      ['credentials']
    );

    if (!integration) {
      throw new NotFoundException(`Runtime integration not found for agent "${command.agentId}".`);
    }

    const decryptedCredentials = decryptCredentials(integration.credentials);

    if (!decryptedCredentials.apiKey) {
      throw new UnprocessableEntityException(
        `Integration for agent "${command.agentId}" has no API key configured. Please complete the integration setup.`
      );
    }

    const enabled = await this.agentMcpServerRepository.findByAgent({
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      agentId: command.agentId,
      enabledOnly: true,
    });

    const projection = projectMcpRowsToCatalog(enabled, this.logger, {
      agentId: command.agentId,
      useCase: SyncAgentMcpServers.name,
    });

    const runtimeProvider = getAgentRuntimeProvider(providerId, decryptedCredentials.apiKey);

    try {
      await runtimeProvider.updateConfig(externalAgentId, { mcpServers: projection });
    } catch (err) {
      const code = err instanceof Error ? err.name || 'sync_error' : 'sync_error';
      const message = err instanceof Error ? err.message : 'Unknown provider error';
      const at = new Date();

      this.logger.error(
        { err, agentId: command.agentId, providerId },
        'Failed to project enabled MCP set onto runtime provider'
      );

      await Promise.allSettled(
        enabled.map((row) =>
          this.agentMcpServerRepository.update(
            {
              _id: row._id,
              _environmentId: command.environmentId,
              _organizationId: command.organizationId,
            },
            { $set: { status: 'error', lastError: { code, message, at } } }
          )
        )
      );

      throw err;
    }

    const syncedAt = new Date();
    await Promise.all(
      enabled.map((row) =>
        this.agentMcpServerRepository.update(
          {
            _id: row._id,
            _environmentId: command.environmentId,
            _organizationId: command.organizationId,
          },
          {
            $set: {
              externalProjection: {
                providerId,
                mcpServerName: MCP_SERVERS.find((c) => c.id === row.mcpId)?.name ?? row.mcpId,
                syncedAt,
              },
              status: 'active',
            },
            $unset: { lastError: 1 },
          }
        )
      )
    );
  }
}
