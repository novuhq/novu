import { FilterQuery } from 'mongoose';

import type { EnforceEnvOrOrgIds } from '../../types';
import { BaseRepositoryV2 } from '../base-repository-v2';
import { McpConnectionDBModel, McpConnectionEntity, McpConnectionPendingTurn } from './mcp-connection.entity';
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
   * Park a managed-agent job on the (agent_mcp_server, subscriber) connection
   * so the OAuth callback can replay it once the subscriber finishes
   * authorising. Overwrites any previous parked turn — the latest user
   * message is the one we want to answer.
   */
  async setPendingTurn({
    organizationId,
    environmentId,
    connectionId,
    pendingTurn,
  }: {
    organizationId: string;
    environmentId: string;
    connectionId: string;
    pendingTurn: McpConnectionPendingTurn;
  }): Promise<void> {
    await this.update(
      {
        _id: connectionId,
        _environmentId: environmentId,
        _organizationId: organizationId,
      },
      { $set: { pendingTurn } }
    );
  }

  /**
   * Clear the parked turn after the OAuth callback successfully re-enqueues
   * it. Idempotent — a no-op if nothing is parked.
   */
  async clearPendingTurn({
    organizationId,
    environmentId,
    connectionId,
  }: {
    organizationId: string;
    environmentId: string;
    connectionId: string;
  }): Promise<void> {
    await this.update(
      {
        _id: connectionId,
        _environmentId: environmentId,
        _organizationId: organizationId,
      },
      { $unset: { pendingTurn: 1 } }
    );
  }
}
