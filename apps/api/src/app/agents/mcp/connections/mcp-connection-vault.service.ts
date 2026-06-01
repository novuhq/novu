import { Injectable } from '@nestjs/common';
import { type IAgentRuntimeProvider, PinoLogger } from '@novu/application-generic';
import {
  AgentMcpServerEntity,
  AgentMcpServerRepository,
  McpConnectionEntity,
  McpConnectionRepository,
} from '@novu/dal';
import { MCP_SERVERS, McpConnectionScopeEnum, McpConnectionStatusEnum } from '@novu/shared';

@Injectable()
export class McpConnectionVaultService {
  constructor(
    private readonly mcpConnectionRepository: McpConnectionRepository,
    private readonly agentMcpServerRepository: AgentMcpServerRepository,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  /**
   * Resolve Anthropic `vault_ids` for a managed-agent turn.
   *
   * Subscriber-scoped only in v1: anonymous platform turns (no subscriber)
   * receive `[]` because no write path creates `scope: 'agent'` rows today.
   * When OAuth MCPs are enabled but no vault exists yet, one is created so
   * credentials can be bound via `vault_ids` after the subscriber completes
   * in-thread OAuth (dispatch is gated until then).
   */
  async resolveVaultIds(params: {
    agentId: string;
    environmentId: string;
    organizationId: string;
    subscriberMongoId?: string;
    runtimeProvider?: IAgentRuntimeProvider;
  }): Promise<string[]> {
    if (!params.subscriberMongoId) {
      return [];
    }

    const enabledAgentMcpServerIds = await this.listAgentMcpServerIds(params, true);
    const subscriberVaultId = await this.resolveSubscriberVaultId({
      agentId: params.agentId,
      environmentId: params.environmentId,
      organizationId: params.organizationId,
      subscriberMongoId: params.subscriberMongoId,
      agentMcpServerIds: enabledAgentMcpServerIds,
      runtimeProvider: params.runtimeProvider,
    });

    return subscriberVaultId ? [subscriberVaultId] : [];
  }

  /**
   * Ensure the connection owner has an Anthropic vault container and return its id.
   * Subscriber-scoped connections on the same agent share one vault across MCPs.
   *
   * Race-safe: two concurrent OAuth callbacks on the same `(subscriber, agent)`
   * each create an upstream vault, but only the first writer's id is persisted
   * — the loser detects the race on re-read, logs its orphan upstream id, and
   * returns the winner's value so both flows converge on a single vault.
   */
  async ensureConnectionVault(params: {
    connection: McpConnectionEntity;
    agentId: string;
    runtimeProvider: IAgentRuntimeProvider;
  }): Promise<string> {
    const { connection, agentId, runtimeProvider } = params;

    if (connection.auth?.externalVaultId) {
      return connection.auth.externalVaultId;
    }

    const agentMcpServerIds = await this.listAgentMcpServerIds(
      {
        agentId,
        environmentId: connection._environmentId,
        organizationId: connection._organizationId,
      },
      false
    );

    if (connection.scope === McpConnectionScopeEnum.Subscriber && connection._subscriberId) {
      const siblingVaultId = await this.mcpConnectionRepository.findSubscriberExternalVaultId({
        organizationId: connection._organizationId,
        environmentId: connection._environmentId,
        subscriberId: connection._subscriberId,
        agentMcpServerIds,
      });

      if (siblingVaultId) {
        await this.mcpConnectionRepository.setConnectionExternalVaultIdIfMissing({
          connectionId: connection._id,
          environmentId: connection._environmentId,
          organizationId: connection._organizationId,
          externalVaultId: siblingVaultId,
        });

        return siblingVaultId;
      }
    }

    const displayName =
      connection.scope === McpConnectionScopeEnum.Subscriber && connection._subscriberId
        ? `nv-sub-${connection._subscriberId}`
        : `nv-agent-${agentId}`;

    const { externalVaultId } = await runtimeProvider.createVault({ displayName });

    const claimed = await this.mcpConnectionRepository.setConnectionExternalVaultIdIfMissing({
      connectionId: connection._id,
      environmentId: connection._environmentId,
      organizationId: connection._organizationId,
      externalVaultId,
    });

    if (!claimed) {
      const winnerVaultId = await this.refetchConnectionExternalVaultId(connection);
      this.logOrphanVault({
        connection,
        ourVaultId: externalVaultId,
        winnerVaultId,
        reason: 'connection_claim_lost',
      });

      return winnerVaultId ?? externalVaultId;
    }

    if (connection.scope === McpConnectionScopeEnum.Subscriber && connection._subscriberId) {
      await this.mcpConnectionRepository.setSubscriberExternalVaultIdIfMissing({
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

    const oauthEnablements = await this.agentMcpServerRepository.findOAuthEnablementsForAgent({
      organizationId: params.organizationId,
      environmentId: params.environmentId,
      agentId: params.agentId,
    });

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
   * via `vault_ids` when credentials are pushed after the in-thread Connect flow.
   *
   * Race-safe across concurrent first-time dispatches:
   *   1. Re-check siblings inside the function (covers races that resolved
   *      between the caller's read and our entry).
   *   2. Provision a vault upstream.
   *   3. Either propagate onto existing connection rows OR insert an anchor
   *      row. Both write paths converge on `setIfMissing` semantics so the
   *      first writer wins and subsequent racers read the winner's vault id.
   *      The loser's upstream vault is logged for follow-up cleanup.
   */
  private async ensureSubscriberVaultAnchor(params: {
    environmentId: string;
    organizationId: string;
    subscriberMongoId: string;
    agentMcpServerIds: string[];
    oauthEnablements: AgentMcpServerEntity[];
    runtimeProvider: IAgentRuntimeProvider;
  }): Promise<string> {
    const recheck = await this.mcpConnectionRepository.findSubscriberExternalVaultId({
      organizationId: params.organizationId,
      environmentId: params.environmentId,
      subscriberId: params.subscriberMongoId,
      agentMcpServerIds: params.agentMcpServerIds,
    });

    if (recheck) {
      return recheck;
    }

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
      await this.mcpConnectionRepository.setSubscriberExternalVaultIdIfMissing({
        organizationId: params.organizationId,
        environmentId: params.environmentId,
        subscriberId: params.subscriberMongoId,
        agentMcpServerIds: params.agentMcpServerIds,
        externalVaultId,
      });

      const winner = await this.mcpConnectionRepository.findSubscriberExternalVaultId({
        organizationId: params.organizationId,
        environmentId: params.environmentId,
        subscriberId: params.subscriberMongoId,
        agentMcpServerIds: params.agentMcpServerIds,
      });

      if (winner && winner !== externalVaultId) {
        this.logOrphanVault({
          connection: connections[0],
          ourVaultId: externalVaultId,
          winnerVaultId: winner,
          reason: 'subscriber_propagate_lost',
        });

        return winner;
      }

      return externalVaultId;
    }

    const anchor = params.oauthEnablements[0];
    const catalog = MCP_SERVERS.find((entry) => entry.id === anchor.mcpId);

    if (!catalog?.oauth) {
      this.logOrphanVault({
        ourVaultId: externalVaultId,
        winnerVaultId: undefined,
        reason: 'anchor_catalog_missing_oauth',
        organizationId: params.organizationId,
        environmentId: params.environmentId,
        subscriberId: params.subscriberMongoId,
      });

      return externalVaultId;
    }

    try {
      await this.mcpConnectionRepository.create({
        _organizationId: params.organizationId,
        _environmentId: params.environmentId,
        scope: McpConnectionScopeEnum.Subscriber,
        mcpId: anchor.mcpId,
        _agentMcpServerId: anchor._id,
        _subscriberId: params.subscriberMongoId,
        authMode: catalog.oauth.mode,
        status: McpConnectionStatusEnum.PendingOAuth,
        auth: { externalVaultId },
      });

      return externalVaultId;
    } catch (err) {
      if (!isDuplicateKeyError(err)) {
        throw err;
      }

      // Another writer inserted the anchor row first. Either the winner
      // already carries a vault id (we have an orphan upstream and must use
      // theirs) or they inserted without one (e.g. `GenerateMcpOAuthUrl`
      // racing ahead) and we can still claim the slot.
      const winner = await this.mcpConnectionRepository.findSubscriberExternalVaultId({
        organizationId: params.organizationId,
        environmentId: params.environmentId,
        subscriberId: params.subscriberMongoId,
        agentMcpServerIds: params.agentMcpServerIds,
      });

      if (winner) {
        this.logOrphanVault({
          ourVaultId: externalVaultId,
          winnerVaultId: winner,
          reason: 'subscriber_anchor_insert_lost',
          organizationId: params.organizationId,
          environmentId: params.environmentId,
          subscriberId: params.subscriberMongoId,
        });

        return winner;
      }

      await this.mcpConnectionRepository.setSubscriberExternalVaultIdIfMissing({
        organizationId: params.organizationId,
        environmentId: params.environmentId,
        subscriberId: params.subscriberMongoId,
        agentMcpServerIds: params.agentMcpServerIds,
        externalVaultId,
      });

      const claimed = await this.mcpConnectionRepository.findSubscriberExternalVaultId({
        organizationId: params.organizationId,
        environmentId: params.environmentId,
        subscriberId: params.subscriberMongoId,
        agentMcpServerIds: params.agentMcpServerIds,
      });

      if (claimed && claimed !== externalVaultId) {
        this.logOrphanVault({
          ourVaultId: externalVaultId,
          winnerVaultId: claimed,
          reason: 'subscriber_setif_lost',
          organizationId: params.organizationId,
          environmentId: params.environmentId,
          subscriberId: params.subscriberMongoId,
        });

        return claimed;
      }

      return externalVaultId;
    }
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

  private async refetchConnectionExternalVaultId(connection: McpConnectionEntity): Promise<string | null> {
    const refreshed = await this.mcpConnectionRepository.findOne(
      {
        _id: connection._id,
        _environmentId: connection._environmentId,
        _organizationId: connection._organizationId,
      },
      '*'
    );

    return refreshed?.auth?.externalVaultId ?? null;
  }

  /**
   * Record an upstream-vault leak after a write race. The vault still exists
   * on Anthropic's side and consumes quota; an out-of-band reaper (or a
   * future `archiveVault` runtime call) can pick it up by the logged
   * identifiers.
   */
  private logOrphanVault(args: {
    connection?: McpConnectionEntity;
    ourVaultId: string;
    winnerVaultId: string | null | undefined;
    reason: string;
    organizationId?: string;
    environmentId?: string;
    subscriberId?: string;
  }): void {
    this.logger.warn(
      {
        orphanExternalVaultId: args.ourVaultId,
        winnerExternalVaultId: args.winnerVaultId ?? null,
        reason: args.reason,
        connectionId: args.connection?._id,
        organizationId: args.connection?._organizationId ?? args.organizationId,
        environmentId: args.connection?._environmentId ?? args.environmentId,
        subscriberId: args.connection?._subscriberId ?? args.subscriberId,
      },
      'Lost vault-creation race; upstream Anthropic vault was created but not adopted (orphan)'
    );
  }
}

/**
 * MongoDB duplicate-key error sentinel (E11000). Avoids importing the full
 * mongodb driver types — every Mongoose write path wraps the native error
 * with `.code === 11000`.
 */
function isDuplicateKeyError(err: unknown): boolean {
  return Boolean(err && typeof err === 'object' && 'code' in err && (err as { code: unknown }).code === 11000);
}
