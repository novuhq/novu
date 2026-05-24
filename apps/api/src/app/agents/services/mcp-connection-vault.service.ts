import { Injectable } from '@nestjs/common';
import { type IAgentRuntimeProvider } from '@novu/application-generic';
import {
  AgentMcpServerEntity,
  AgentMcpServerRepository,
  McpConnectionEntity,
  McpConnectionRepository,
} from '@novu/dal';
import { MCP_SERVERS, McpConnectionAuthModeEnum, McpConnectionScopeEnum, McpConnectionStatusEnum } from '@novu/shared';

@Injectable()
export class McpConnectionVaultService {
  constructor(
    private readonly mcpConnectionRepository: McpConnectionRepository,
    private readonly agentMcpServerRepository: AgentMcpServerRepository
  ) {}

  /**
   * Resolve Anthropic `vault_ids` for a managed-agent turn.
   *
   * - Subscriber present → that subscriber's scoped vault on this agent only.
   *   When OAuth MCPs are enabled but no vault exists yet, one is created so
   *   Anthropic can attempt MCP init (triggering the lazy Connect card on failure).
   * - No subscriber → agent-scoped vault from `mcp_connection` rows only.
   */
  async resolveVaultIds(params: {
    agentId: string;
    environmentId: string;
    organizationId: string;
    subscriberMongoId?: string;
    runtimeProvider?: IAgentRuntimeProvider;
  }): Promise<string[]> {
    const enabledAgentMcpServerIds = await this.listAgentMcpServerIds(params, true);

    if (params.subscriberMongoId) {
      const subscriberVaultId = await this.resolveSubscriberVaultId({
        agentId: params.agentId,
        environmentId: params.environmentId,
        organizationId: params.organizationId,
        subscriberMongoId: params.subscriberMongoId,
        agentMcpServerIds: enabledAgentMcpServerIds,
        runtimeProvider: params.runtimeProvider,
      });

      if (subscriberVaultId) {
        return [subscriberVaultId];
      }

      return [];
    }

    const agentMcpServerIds = await this.listAgentMcpServerIds(params, false);
    const agentVaultId = await this.mcpConnectionRepository.findAgentScopeExternalVaultId({
      organizationId: params.organizationId,
      environmentId: params.environmentId,
      agentMcpServerIds,
    });

    if (agentVaultId) {
      return [agentVaultId];
    }

    return [];
  }

  /**
   * Ensure the connection owner has an Anthropic vault container and return its id.
   * Subscriber-scoped connections on the same agent share one vault across MCPs.
   */
  async ensureConnectionVault(params: {
    connection: McpConnectionEntity;
    agentId: string;
    runtimeProvider: IAgentRuntimeProvider;
  }): Promise<string> {
    const { connection, agentId, runtimeProvider } = params;
    const existing = connection.auth?.externalVaultId;

    if (existing) {
      return existing;
    }

    const agentMcpServerIds = await this.listAgentMcpServerIds(
      {
        agentId,
        environmentId: connection._environmentId,
        organizationId: connection._organizationId,
      },
      false
    );

    if (connection.scope === 'subscriber' && connection._subscriberId) {
      const siblingVaultId = await this.mcpConnectionRepository.findSubscriberExternalVaultId({
        organizationId: connection._organizationId,
        environmentId: connection._environmentId,
        subscriberId: connection._subscriberId,
        agentMcpServerIds,
      });

      if (siblingVaultId) {
        await this.persistConnectionExternalVaultId(connection, siblingVaultId);

        return siblingVaultId;
      }
    }

    const displayName =
      connection.scope === 'subscriber' && connection._subscriberId
        ? `nv-sub-${connection._subscriberId}`
        : `nv-agent-${agentId}`;

    const { externalVaultId } = await runtimeProvider.createVault({ displayName });

    await this.persistConnectionExternalVaultId(connection, externalVaultId);

    if (connection.scope === 'subscriber' && connection._subscriberId) {
      await this.mcpConnectionRepository.propagateSubscriberExternalVaultId({
        organizationId: connection._organizationId,
        environmentId: connection._environmentId,
        subscriberId: connection._subscriberId,
        agentMcpServerIds,
        externalVaultId,
      });
    }

    return externalVaultId;
  }

  private async resolveSubscriberVaultId(params: {
    agentId: string;
    environmentId: string;
    organizationId: string;
    subscriberMongoId: string;
    agentMcpServerIds: string[];
    runtimeProvider?: IAgentRuntimeProvider;
  }): Promise<string | null> {
    const existingVaultId = await this.mcpConnectionRepository.findSubscriberExternalVaultId({
      organizationId: params.organizationId,
      environmentId: params.environmentId,
      subscriberId: params.subscriberMongoId,
      agentMcpServerIds: params.agentMcpServerIds,
    });

    if (existingVaultId) {
      return existingVaultId;
    }

    if (!params.runtimeProvider?.capabilities.tokenVault) {
      return null;
    }

    const oauthEnablements = await this.listOAuthEnablements(params);

    if (oauthEnablements.length === 0) {
      return null;
    }

    return this.ensureSubscriberVaultAnchor({
      environmentId: params.environmentId,
      organizationId: params.organizationId,
      subscriberMongoId: params.subscriberMongoId,
      agentMcpServerIds: params.agentMcpServerIds,
      oauthEnablements,
      runtimeProvider: params.runtimeProvider,
    });
  }

  /**
   * Create and persist a subscriber vault before OAuth so sessions can opt in
   * via `vault_ids` and MCP init failures surface the Connect card.
   */
  private async ensureSubscriberVaultAnchor(params: {
    environmentId: string;
    organizationId: string;
    subscriberMongoId: string;
    agentMcpServerIds: string[];
    oauthEnablements: AgentMcpServerEntity[];
    runtimeProvider: IAgentRuntimeProvider;
  }): Promise<string> {
    const { externalVaultId } = await params.runtimeProvider.createVault({
      displayName: `nv-sub-${params.subscriberMongoId}`,
    });

    const connections = await this.mcpConnectionRepository.findSubscriberConnectionsForAgent({
      organizationId: params.organizationId,
      environmentId: params.environmentId,
      subscriberId: params.subscriberMongoId,
      agentMcpServerIds: params.agentMcpServerIds,
    });

    if (connections.length > 0) {
      await this.mcpConnectionRepository.propagateSubscriberExternalVaultId({
        organizationId: params.organizationId,
        environmentId: params.environmentId,
        subscriberId: params.subscriberMongoId,
        agentMcpServerIds: params.agentMcpServerIds,
        externalVaultId,
      });

      return externalVaultId;
    }

    const anchor = params.oauthEnablements[0];
    const catalog = MCP_SERVERS.find((entry) => entry.id === anchor.mcpId);

    if (!catalog?.oauth) {
      return externalVaultId;
    }

    await this.mcpConnectionRepository.create({
      _organizationId: params.organizationId,
      _environmentId: params.environmentId,
      scope: McpConnectionScopeEnum.Subscriber,
      mcpId: anchor.mcpId,
      _agentMcpServerId: anchor._id,
      _subscriberId: params.subscriberMongoId,
      authMode: catalog.oauth.mode as McpConnectionAuthModeEnum,
      status: McpConnectionStatusEnum.PendingOAuth,
      auth: { externalVaultId },
    });

    return externalVaultId;
  }

  private async listOAuthEnablements(params: {
    agentId: string;
    environmentId: string;
    organizationId: string;
  }): Promise<AgentMcpServerEntity[]> {
    const enablements = await this.agentMcpServerRepository.findByAgent({
      organizationId: params.organizationId,
      environmentId: params.environmentId,
      agentId: params.agentId,
      enabledOnly: true,
    });

    return enablements.filter((row) => MCP_SERVERS.some((entry) => entry.id === row.mcpId && entry.oauth));
  }

  private async listAgentMcpServerIds(
    params: {
      agentId: string;
      environmentId: string;
      organizationId: string;
    },
    enabledOnly: boolean
  ): Promise<string[]> {
    const enablements = await this.agentMcpServerRepository.findByAgent({
      organizationId: params.organizationId,
      environmentId: params.environmentId,
      agentId: params.agentId,
      enabledOnly,
    });

    return enablements.map((row) => row._id);
  }

  private async persistConnectionExternalVaultId(
    connection: McpConnectionEntity,
    externalVaultId: string
  ): Promise<void> {
    await this.mcpConnectionRepository.update(
      {
        _id: connection._id,
        _environmentId: connection._environmentId,
        _organizationId: connection._organizationId,
      },
      { $set: { 'auth.externalVaultId': externalVaultId } }
    );
  }
}
