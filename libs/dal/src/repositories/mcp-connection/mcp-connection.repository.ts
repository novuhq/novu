import { FilterQuery } from 'mongoose';

import type { EnforceEnvOrOrgIds } from '../../types';
import { BaseRepositoryV2 } from '../base-repository-v2';
import { McpConnectionDBModel, McpConnectionEntity } from './mcp-connection.entity';
import { McpConnection } from './mcp-connection.schema';

export class McpConnectionRepository extends BaseRepositoryV2<
  McpConnectionDBModel,
  McpConnectionEntity,
  EnforceEnvOrOrgIds
> {
  constructor() {
    super(McpConnection, McpConnectionEntity);
  }

  /**
   * Lookup the subscriber-scope connection for a given (agent_mcp_server,
   * subscriber). Returns `null` when the subscriber has not yet authorised.
   */
  async findSubscriberConnection({
    organizationId,
    environmentId,
    agentMcpServerId,
    subscriberId,
  }: {
    organizationId: string;
    environmentId: string;
    agentMcpServerId: string;
    subscriberId: string;
  }): Promise<McpConnectionEntity | null> {
    return this.findOne(
      {
        _environmentId: environmentId,
        _organizationId: organizationId,
        _agentMcpServerId: agentMcpServerId,
        _subscriberId: subscriberId,
        scope: 'subscriber',
      },
      '*'
    );
  }

  /**
   * List all connections that belong to a given enabled MCP. Used during
   * cascade-deletes when an MCP is disabled on an agent.
   */
  async findByAgentMcpServer({
    organizationId,
    environmentId,
    agentMcpServerId,
  }: {
    organizationId: string;
    environmentId: string;
    agentMcpServerId: string;
  }): Promise<McpConnectionEntity[]> {
    const query: FilterQuery<McpConnectionDBModel> & EnforceEnvOrOrgIds = {
      _environmentId: environmentId,
      _organizationId: organizationId,
      _agentMcpServerId: agentMcpServerId,
    };

    return this.find(query, '*');
  }

  /**
   * Return the scoped vault id (`auth.externalVaultId`) for a subscriber on an
   * agent, reusing any sibling MCP connection row that already owns a vault.
   */
  async findSubscriberExternalVaultId({
    organizationId,
    environmentId,
    subscriberId,
    agentMcpServerIds,
  }: {
    organizationId: string;
    environmentId: string;
    subscriberId: string;
    agentMcpServerIds: string[];
  }): Promise<string | null> {
    if (agentMcpServerIds.length === 0) {
      return null;
    }

    const connection = await this.findOne(
      {
        _environmentId: environmentId,
        _organizationId: organizationId,
        _subscriberId: subscriberId,
        scope: 'subscriber',
        _agentMcpServerId: { $in: agentMcpServerIds },
        'auth.externalVaultId': { $exists: true, $nin: [null, ''] },
      },
      '*'
    );

    return connection?.auth?.externalVaultId ?? null;
  }

  /**
   * Return the shared vault id for agent-scoped connections (no subscriber).
   */
  async findAgentScopeExternalVaultId({
    organizationId,
    environmentId,
    agentMcpServerIds,
  }: {
    organizationId: string;
    environmentId: string;
    agentMcpServerIds: string[];
  }): Promise<string | null> {
    if (agentMcpServerIds.length === 0) {
      return null;
    }

    const connection = await this.findOne(
      {
        _environmentId: environmentId,
        _organizationId: organizationId,
        scope: 'agent',
        _agentMcpServerId: { $in: agentMcpServerIds },
        'auth.externalVaultId': { $exists: true, $nin: [null, ''] },
      },
      '*'
    );

    return connection?.auth?.externalVaultId ?? null;
  }

  /**
   * List subscriber-scoped connections for an agent's enablement rows.
   */
  async findSubscriberConnectionsForAgent({
    organizationId,
    environmentId,
    subscriberId,
    agentMcpServerIds,
  }: {
    organizationId: string;
    environmentId: string;
    subscriberId: string;
    agentMcpServerIds: string[];
  }): Promise<McpConnectionEntity[]> {
    if (agentMcpServerIds.length === 0) {
      return [];
    }

    return this.find(
      {
        _environmentId: environmentId,
        _organizationId: organizationId,
        _subscriberId: subscriberId,
        scope: 'subscriber',
        _agentMcpServerId: { $in: agentMcpServerIds },
      },
      '*'
    );
  }

  /**
   * Copy a subscriber's vault id onto every MCP connection row for that agent
   * so subsequent MCP OAuth flows reuse the same Anthropic vault container.
   */
  async propagateSubscriberExternalVaultId({
    organizationId,
    environmentId,
    subscriberId,
    agentMcpServerIds,
    externalVaultId,
  }: {
    organizationId: string;
    environmentId: string;
    subscriberId: string;
    agentMcpServerIds: string[];
    externalVaultId: string;
  }): Promise<void> {
    if (agentMcpServerIds.length === 0) {
      return;
    }

    await this.update(
      {
        _environmentId: environmentId,
        _organizationId: organizationId,
        _subscriberId: subscriberId,
        scope: 'subscriber',
        _agentMcpServerId: { $in: agentMcpServerIds },
      },
      { $set: { 'auth.externalVaultId': externalVaultId } }
    );
  }
}
