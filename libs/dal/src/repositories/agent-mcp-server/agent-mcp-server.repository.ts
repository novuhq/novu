import { MCP_SERVERS } from '@novu/shared';
import { FilterQuery } from 'mongoose';

import type { EnforceEnvOrOrgIds } from '../../types';
import { BaseRepositoryV2 } from '../base-repository-v2';
import { type AgentMcpServerDBModel, AgentMcpServerEntity } from './agent-mcp-server.entity';
import { AgentMcpServer } from './agent-mcp-server.schema';

export class AgentMcpServerRepository extends BaseRepositoryV2<
  AgentMcpServerDBModel,
  AgentMcpServerEntity,
  EnforceEnvOrOrgIds
> {
  constructor() {
    super(AgentMcpServer, AgentMcpServerEntity);
  }

  /**
   * List every MCP enabled on a given agent. Used to project to the
   * provider's agent resource and to render the dashboard's MCP picker
   * without round-tripping to the provider API.
   */
  async findByAgent({
    organizationId,
    environmentId,
    agentId,
    enabledOnly = false,
  }: {
    organizationId: string;
    environmentId: string;
    agentId: string;
    enabledOnly?: boolean;
  }) {
    const query: FilterQuery<AgentMcpServerDBModel> & EnforceEnvOrOrgIds = {
      _environmentId: environmentId,
      _organizationId: organizationId,
      _agentId: agentId,
    };

    if (enabledOnly) {
      query.enabled = true;
    }

    return this.find(query, '*');
  }

  /**
   * Enabled MCP rows on an agent whose catalog entry requires OAuth.
   */
  async findOAuthEnablementsForAgent({
    organizationId,
    environmentId,
    agentId,
  }: {
    organizationId: string;
    environmentId: string;
    agentId: string;
  }) {
    const enablements = await this.findByAgent({
      organizationId,
      environmentId,
      agentId,
      enabledOnly: true,
    });

    return enablements.filter((row) => MCP_SERVERS.some((entry) => entry.id === row.mcpId && entry.oauth));
  }

  async findByAgentAndMcpId({
    organizationId,
    environmentId,
    agentId,
    mcpId,
  }: {
    organizationId: string;
    environmentId: string;
    agentId: string;
    mcpId: string;
  }) {
    return this.findOne(
      {
        _environmentId: environmentId,
        _organizationId: organizationId,
        _agentId: agentId,
        mcpId,
      },
      '*'
    );
  }
}
