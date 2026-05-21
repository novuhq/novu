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
}
