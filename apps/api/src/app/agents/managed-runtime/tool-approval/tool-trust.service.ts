import { Injectable } from '@nestjs/common';
import { type PendingToolApproval } from '@novu/application-generic';
import {
  AgentRepository,
  AgentToolTrustRepository,
  type AgentToolTrustState,
  DEFAULT_TOOL_TRUST_POLICY,
  SubscriberRepository,
  type ToolTrust,
  type ToolTrustPolicy,
} from '@novu/dal';
import type { ToolTrustTarget } from '../../shared/tool-approval/action-id';

@Injectable()
export class ToolTrustService {
  constructor(
    private readonly agentToolTrustRepository: AgentToolTrustRepository,
    private readonly agentRepository: AgentRepository,
    private readonly subscriberRepository: SubscriberRepository
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

    const trust: AgentToolTrustState = row?.trust ?? {};

    const autoApprovedTools: PendingToolApproval[] = [];
    const pendingApprovalTools: PendingToolApproval[] = [];

    for (const tool of params.tools) {
      if (this.isToolTrusted(trust, tool)) {
        autoApprovedTools.push(tool);
      } else {
        pendingApprovalTools.push(tool);
      }
    }

    return { autoApprovedTools, pendingApprovalTools };
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
