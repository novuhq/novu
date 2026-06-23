import type { EnforceEnvOrOrgIds } from '../../types';
import { BaseRepositoryV2 } from '../base-repository-v2';
import {
  AgentToolTrustDBModel,
  AgentToolTrustEntity,
  type ToolTrust,
  type ToolTrustPolicy,
} from './agent-tool-trust.entity';
import { AgentToolTrust } from './agent-tool-trust.schema';

export type ToolTrustSource = 'mcp' | 'direct';

export type ToolTrustPersistScope = 'tool' | 'server';

export class AgentToolTrustRepository extends BaseRepositoryV2<
  AgentToolTrustDBModel,
  AgentToolTrustEntity,
  EnforceEnvOrOrgIds
> {
  constructor() {
    super(AgentToolTrust, AgentToolTrustEntity);
  }

  /**
   * The trust row for a `(agent, subscriber)`. Returns `null` before the
   * subscriber has trusted anything on this agent.
   */
  async findByAgentSubscriber({
    organizationId,
    environmentId,
    agentId,
    subscriberId,
  }: {
    organizationId: string;
    environmentId: string;
    agentId: string;
    subscriberId: string;
  }): Promise<AgentToolTrustEntity | null> {
    return this.findOne(
      {
        _environmentId: environmentId,
        _organizationId: organizationId,
        _agentId: agentId,
        _subscriberId: subscriberId,
      },
      '*'
    );
  }

  /**
   * Persist an "always allow" preference. Upserts the single
   * `(agent, subscriber)` row and sets exactly one trust path:
   *
   *  - `server` scope → `trust.<source>.serverDefault`
   *  - `tool`   scope → `trust.<source>.tools.<toolName>`
   *
   * For `mcp` source the bucket is nested under the `mcpServerName`.
   */
  async setToolTrust(params: {
    organizationId: string;
    environmentId: string;
    agentId: string;
    subscriberId: string;
    source: ToolTrustSource;
    scope: ToolTrustPersistScope;
    /** Required when `source === 'mcp'`. */
    mcpServerName?: string;
    /** Required when `scope === 'tool'`. */
    toolName?: string;
    policy: ToolTrustPolicy;
  }): Promise<void> {
    const path = this.buildTrustPath(params);

    await this.update(
      {
        _environmentId: params.environmentId,
        _organizationId: params.organizationId,
        _agentId: params.agentId,
        _subscriberId: params.subscriberId,
      },
      { $set: { [path]: params.policy } },
      { upsert: true }
    );
  }

  /**
   * Replace an MCP server's entire trust bucket in a single atomic update.
   * Used by the legacy backfill so a multi-tool copy can never be left partial.
   */
  async setMcpServerTrust(params: {
    organizationId: string;
    environmentId: string;
    agentId: string;
    subscriberId: string;
    mcpServerName: string;
    bucket: ToolTrust;
  }): Promise<void> {
    assertSafeToolTrustKeySegment(params.mcpServerName);
    for (const toolName of Object.keys(params.bucket.tools ?? {})) {
      assertSafeToolTrustKeySegment(toolName);
    }

    await this.update(
      {
        _environmentId: params.environmentId,
        _organizationId: params.organizationId,
        _agentId: params.agentId,
        _subscriberId: params.subscriberId,
      },
      { $set: { [`trust.mcp.${params.mcpServerName}`]: params.bucket } },
      { upsert: true }
    );
  }

  private buildTrustPath(params: {
    source: ToolTrustSource;
    scope: ToolTrustPersistScope;
    mcpServerName?: string;
    toolName?: string;
  }): string {
    let base: string;

    if (params.source === 'mcp') {
      if (!params.mcpServerName) {
        throw new Error('mcpServerName required for mcp tool trust');
      }
      assertSafeToolTrustKeySegment(params.mcpServerName);
      base = `trust.mcp.${params.mcpServerName}`;
    } else {
      base = 'trust.direct';
    }

    if (params.scope === 'server') {
      return `${base}.serverDefault`;
    }

    if (!params.toolName) {
      throw new Error('toolName required for tool scope');
    }
    assertSafeToolTrustKeySegment(params.toolName);

    return `${base}.tools.${params.toolName}`;
  }
}

function assertSafeToolTrustKeySegment(name: string): void {
  // Interpolated into a dotted Mongo update path; `.` / `$` / NUL would corrupt it.
  if (name.includes('.') || name.includes('$') || name.includes('\0')) {
    throw new Error(`Invalid tool trust key segment: ${name}`);
  }
}
