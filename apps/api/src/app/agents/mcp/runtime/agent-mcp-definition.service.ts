import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PinoLogger, resolveAgentRuntime } from '@novu/application-generic';
import { AgentMcpServerEntity, AgentMcpServerRepository, AgentRepository, IntegrationRepository } from '@novu/dal';
import { MCP_SERVERS, McpConnectionScopeEnum } from '@novu/shared';

export type CatalogProjection = { externalId: string; name: string; url: string };

export type AgentMcpDefinitionProjectContext = {
  agentId: string;
  caller: string;
};

export type AgentMcpDefinitionReconcileParams = {
  agentId: string;
  environmentId: string;
  organizationId: string;
};

type ProjectableMcpRow = Pick<AgentMcpServerEntity, 'mcpId' | 'defaultScope'>;

/**
 * Whether an enabled MCP belongs on Anthropic's **shared agent** (`agent.mcp_servers`).
 *
 * OAuth MCPs where each subscriber connects their own account (e.g. Linear) do not —
 * those are added per conversation after connect, on each `provider.send`.
 */
function belongsOnAgentDefinition(row: Pick<AgentMcpServerEntity, 'mcpId' | 'defaultScope'>): boolean {
  const catalog = MCP_SERVERS.find((entry) => entry.id === row.mcpId);

  if (!catalog?.oauth) {
    return !!catalog;
  }

  return row.defaultScope !== 'subscriber';
}

/**
 * Keeps Anthropic's **shared agent** MCP list in sync with Mongo enablements.
 *
 * Enabling an MCP in the dashboard writes Mongo first (all enabled MCPs). This
 * service decides which of those belong on the shared agent vs per-subscriber
 * session attach handled elsewhere when messages are sent.
 */
@Injectable()
export class AgentMcpDefinitionService {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly agentMcpServerRepository: AgentMcpServerRepository,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  /** Maps enabled rows to the MCP list shown in runtime config API responses. */
  project(rows: ProjectableMcpRow[], context: AgentMcpDefinitionProjectContext): CatalogProjection[] {
    return this.projectMcpRowsToCatalog(rows.filter(belongsOnAgentDefinition), context);
  }

  /** Same rules as `project`, for the `createAgent` call during provisioning. */
  filterIdsForProvision(ids: string[], defaultScope: McpConnectionScopeEnum): string[] {
    return ids.filter((mcpId) => belongsOnAgentDefinition({ mcpId, defaultScope }));
  }

  /** After enable/disable: push the shared-agent MCP list to Anthropic. */
  async reconcile(params: AgentMcpDefinitionReconcileParams): Promise<void> {
    const agent = await this.agentRepository.findOne(
      {
        _id: params.agentId,
        _environmentId: params.environmentId,
        _organizationId: params.organizationId,
      },
      ['_id', 'runtime', 'managedRuntime']
    );

    if (!agent) {
      throw new NotFoundException(`Agent "${params.agentId}" not found.`);
    }

    if (agent.runtime !== 'managed' || !agent.managedRuntime) {
      return;
    }

    const { providerId, _integrationId, externalAgentId } = agent.managedRuntime;

    const integration = await this.integrationRepository.findOne(
      {
        _id: _integrationId,
        _environmentId: params.environmentId,
        _organizationId: params.organizationId,
      },
      ['credentials']
    );

    if (!integration) {
      throw new NotFoundException(`Runtime integration not found for agent "${params.agentId}".`);
    }

    const resolved = resolveAgentRuntime(providerId, integration.credentials);

    if (!resolved) {
      throw new UnprocessableEntityException(
        `Integration for agent "${params.agentId}" has no API key configured. Please complete the integration setup.`
      );
    }

    const enabled = await this.agentMcpServerRepository.findByAgent({
      organizationId: params.organizationId,
      environmentId: params.environmentId,
      agentId: params.agentId,
      enabledOnly: true,
    });

    const projection = this.projectMcpRowsToCatalog(enabled.filter(belongsOnAgentDefinition), {
      agentId: params.agentId,
      caller: AgentMcpDefinitionService.name,
    });

    const runtimeProvider = resolved.provider;
    try {
      // Empty list is normal when only per-subscriber OAuth MCPs are enabled.
      await runtimeProvider.updateConfig(externalAgentId, {
        mcpServers: projection,
      });
    } catch (err) {
      const code = err instanceof Error ? err.name || 'sync_error' : 'sync_error';
      const message = err instanceof Error ? err.message : 'Unknown provider error';
      const at = new Date();

      this.logger.error(
        { err, agentId: params.agentId, providerId },
        'Failed to push shared-agent MCP list to Anthropic'
      );

      const projectedRows = enabled.filter(belongsOnAgentDefinition);

      await Promise.allSettled(
        projectedRows.map((row) =>
          this.agentMcpServerRepository.update(
            {
              _id: row._id,
              _environmentId: params.environmentId,
              _organizationId: params.organizationId,
            },
            { $set: { status: 'error', lastError: { code, message, at } } }
          )
        )
      );

      throw err;
    }

    const syncedAt = new Date();

    await Promise.all(
      enabled.map((row) => {
        if (belongsOnAgentDefinition(row)) {
          return this.agentMcpServerRepository.update(
            {
              _id: row._id,
              _environmentId: params.environmentId,
              _organizationId: params.organizationId,
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
          );
        }

        return this.agentMcpServerRepository.update(
          {
            _id: row._id,
            _environmentId: params.environmentId,
            _organizationId: params.organizationId,
          },
          {
            $set: { status: 'active' },
            $unset: { externalProjection: 1, lastError: 1 },
          }
        );
      })
    );
  }

  private projectMcpRowsToCatalog(
    rows: ProjectableMcpRow[],
    context: AgentMcpDefinitionProjectContext
  ): CatalogProjection[] {
    const projections: CatalogProjection[] = [];
    const orphanMcpIds: string[] = [];

    for (const row of rows) {
      const catalog = MCP_SERVERS.find((entry) => entry.id === row.mcpId);

      if (!catalog) {
        orphanMcpIds.push(row.mcpId);
        continue;
      }

      // Use catalog id (e.g. "slack") — Anthropic matches on this, not the display name.
      projections.push({ externalId: row.mcpId, name: catalog.name, url: catalog.url });
    }

    if (orphanMcpIds.length > 0) {
      this.logger.warn(
        { agentId: context.agentId, caller: context.caller, orphanMcpIds },
        `Dropping ${orphanMcpIds.length} agent_mcp_server row(s) with mcpIds no longer in MCP_SERVERS catalog. ` +
          'Rows remain persisted but will not project onto the runtime provider.'
      );
    }

    return projections;
  }
}
