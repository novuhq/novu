import { Injectable } from '@nestjs/common';
import { type IAgentRuntimeProvider, PinoLogger } from '@novu/application-generic';
import { AgentMcpServerRepository, McpConnectionEntity, McpConnectionRepository } from '@novu/dal';
import { McpConnectionScopeEnum } from '@novu/shared';

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
