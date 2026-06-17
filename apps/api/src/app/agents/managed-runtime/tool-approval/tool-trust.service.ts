import { Injectable } from '@nestjs/common';
import type { PendingToolApproval } from '@novu/application-generic';
import {
  AgentMcpServerRepository,
  AgentRepository,
  AgentToolTrustRepository,
  type AgentToolTrustState,
  DEFAULT_TOOL_TRUST_POLICY,
  McpConnectionRepository,
  SubscriberRepository,
  type ToolTrust,
  type ToolTrustPolicy,
} from '@novu/dal';
import { resolveMcpCatalogIdByName } from '@novu/shared';
import type { ToolTrustTarget } from './approval-card.builder';

@Injectable()
export class ToolTrustService {
  constructor(
    private readonly agentToolTrustRepository: AgentToolTrustRepository,
    private readonly agentRepository: AgentRepository,
    private readonly subscriberRepository: SubscriberRepository,
    private readonly agentMcpServerRepository: AgentMcpServerRepository,
    private readonly mcpConnectionRepository: McpConnectionRepository
  ) {}

  /**
   * Split a batch of pending tool approvals for one `(agent, subscriber)` into
   * the ones the subscriber has pre-approved (`autoApprovedTools`, resolved
   * without a card) and the ones that still need an explicit approval
   * (`pendingApprovalTools`). With no subscriber (anonymous / platform user) or
   * no stored trust, everything stays pending — never auto-approved.
   */
  async partitionByTrust(params: {
    environmentId: string;
    organizationId: string;
    agentIdentifier: string;
    subscriberExternalId?: string;
    tools: PendingToolApproval[];
  }): Promise<{ autoApprovedTools: PendingToolApproval[]; pendingApprovalTools: PendingToolApproval[] }> {
    const subscriberMongoId = await this.resolveSubscriberMongoId(params.environmentId, params.subscriberExternalId);
    const agentMongoId = await this.resolveAgentMongoId(params.environmentId, params.agentIdentifier);

    if (!subscriberMongoId || !agentMongoId) {
      return { autoApprovedTools: [], pendingApprovalTools: [...params.tools] };
    }

    const row = await this.agentToolTrustRepository.findByAgentSubscriber({
      environmentId: params.environmentId,
      organizationId: params.organizationId,
      agentId: agentMongoId,
      subscriberId: subscriberMongoId,
    });

    // Working copy of the stored trust. The legacy backfill below may hydrate it
    // in-memory so every tool in this batch resolves through the unified path.
    const trust: AgentToolTrustState = row?.trust ?? {};

    const autoApprovedTools: PendingToolApproval[] = [];
    const pendingApprovalTools: PendingToolApproval[] = [];
    const legacyMigratedServers = new Set<string>();

    for (const tool of params.tools) {
      const mcpServerName = tool.mcpServerName;

      // First touch of an MCP server with no unified entry: pull its trust over
      // from the legacy store once, then resolve the whole batch against it.
      if (mcpServerName && !trust.mcp?.[mcpServerName] && !legacyMigratedServers.has(mcpServerName)) {
        legacyMigratedServers.add(mcpServerName);

        const bucket = await this.backfillLegacyMcpTrust({
          environmentId: params.environmentId,
          organizationId: params.organizationId,
          agentId: agentMongoId,
          subscriberId: subscriberMongoId,
          mcpServerName,
        });

        if (bucket) {
          trust.mcp = { ...(trust.mcp ?? {}), [mcpServerName]: bucket };
        }
      }

      if (this.isToolTrusted(trust, tool)) {
        autoApprovedTools.push(tool);
      } else {
        pendingApprovalTools.push(tool);
      }
    }

    return { autoApprovedTools, pendingApprovalTools };
  }

  /**
   * TEMPORARY pre-migration backfill: the first time we see an MCP server with
   * no entry in the unified `agent_tool_trust` store, copy its trust bucket over
   * from the legacy `mcp_connection.toolTrust` store (verbatim) and return it so
   * the caller can resolve the current batch against it. After this copy the
   * unified store owns the data, so legacy is read at most once per server.
   *
   * Remove this method (and the two MCP repositories it uses) once the legacy
   * `mcp_connection.toolTrust` data has been fully backfilled and the field has
   * been dropped from the schema.
   */
  private async backfillLegacyMcpTrust(params: {
    environmentId: string;
    organizationId: string;
    agentId: string;
    subscriberId: string;
    mcpServerName: string;
  }): Promise<ToolTrust | undefined> {
    const mcpId = resolveMcpCatalogIdByName(params.mcpServerName);
    if (!mcpId) {
      return undefined;
    }

    const enablement = await this.agentMcpServerRepository.findByAgentAndMcpId({
      organizationId: params.organizationId,
      environmentId: params.environmentId,
      agentId: params.agentId,
      mcpId,
    });
    if (!enablement) {
      return undefined;
    }

    const connection = await this.mcpConnectionRepository.findSubscriberConnection({
      organizationId: params.organizationId,
      environmentId: params.environmentId,
      agentMcpServerId: enablement._id,
      subscriberId: params.subscriberId,
    });

    const legacyBucket = connection?.toolTrust;
    if (!legacyBucket || (legacyBucket.serverDefault === undefined && !legacyBucket.tools)) {
      return undefined;
    }

    if (legacyBucket.serverDefault !== undefined) {
      await this.agentToolTrustRepository.setToolTrust({
        environmentId: params.environmentId,
        organizationId: params.organizationId,
        agentId: params.agentId,
        subscriberId: params.subscriberId,
        source: 'mcp',
        mcpServerName: params.mcpServerName,
        scope: 'server',
        policy: legacyBucket.serverDefault,
      });
    }

    for (const [toolName, policy] of Object.entries(legacyBucket.tools ?? {})) {
      await this.agentToolTrustRepository.setToolTrust({
        environmentId: params.environmentId,
        organizationId: params.organizationId,
        agentId: params.agentId,
        subscriberId: params.subscriberId,
        source: 'mcp',
        mcpServerName: params.mcpServerName,
        scope: 'tool',
        toolName,
        policy,
      });
    }

    return { serverDefault: legacyBucket.serverDefault, tools: legacyBucket.tools };
  }

  /**
   * Persist an "always allow" preference for a tool. Returns `false` when there
   * is no subscriber to attach the preference to (the click then behaves like
   * a one-off approval).
   */
  async persist(params: {
    environmentId: string;
    organizationId: string;
    agentIdentifier: string;
    subscriberExternalId?: string;
    target: ToolTrustTarget;
    policy?: ToolTrustPolicy;
  }): Promise<boolean> {
    const subscriberMongoId = await this.resolveSubscriberMongoId(params.environmentId, params.subscriberExternalId);
    const agentMongoId = await this.resolveAgentMongoId(params.environmentId, params.agentIdentifier);

    if (!subscriberMongoId || !agentMongoId) {
      return false;
    }

    const { target } = params;

    await this.agentToolTrustRepository.setToolTrust({
      environmentId: params.environmentId,
      organizationId: params.organizationId,
      agentId: agentMongoId,
      subscriberId: subscriberMongoId,
      source: target.mcpServerName ? 'mcp' : 'direct',
      mcpServerName: target.mcpServerName,
      scope: target.scope,
      toolName: target.scope === 'tool' ? target.toolName : undefined,
      policy: params.policy ?? 'always_allow',
    });

    return true;
  }

  /**
   * A tool is trusted when its per-tool policy (or the source-wide default)
   * resolves to `always_allow`. MCP tools read their server's entry; every
   * non-MCP tool reads the shared `direct` entry.
   */
  private isToolTrusted(trust: AgentToolTrustState | undefined, tool: PendingToolApproval): boolean {
    const toolTrust: ToolTrust | undefined = tool.mcpServerName ? trust?.mcp?.[tool.mcpServerName] : trust?.direct;
    const policy = toolTrust?.tools?.[tool.toolName] ?? toolTrust?.serverDefault ?? DEFAULT_TOOL_TRUST_POLICY;

    return policy === 'always_allow';
  }

  private async resolveSubscriberMongoId(environmentId: string, subscriberId?: string): Promise<string | undefined> {
    if (!subscriberId) {
      return undefined;
    }

    const subscriber = await this.subscriberRepository.findBySubscriberId(environmentId, subscriberId);

    return subscriber?._id;
  }

  private async resolveAgentMongoId(environmentId: string, agentIdentifier: string): Promise<string | undefined> {
    const agent = await this.agentRepository.findOne({ identifier: agentIdentifier, _environmentId: environmentId }, [
      '_id',
    ]);

    return agent?._id;
  }
}
