import { Injectable } from '@nestjs/common';
import { PinoLogger, resolveAgentRuntime } from '@novu/application-generic';
import { type AgentEntity, AgentRepository, IntegrationRepository } from '@novu/dal';
import { AGENT_MANAGED_DEFINITION_VERSION } from '@novu/shared';

export type AgentRuntimeDefinitionReconcileParams = {
  agentId: string;
  environmentId: string;
  organizationId: string;
};

type ManagedAgent = Pick<AgentEntity, '_id' | 'runtime'> & {
  managedRuntime: NonNullable<AgentEntity['managedRuntime']>;
};

@Injectable()
export class AgentRuntimeDefinitionService {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  /**
   * Re-push Novu-owned managed-agent config to the provider when this agent is
   * behind `AGENT_MANAGED_DEFINITION_VERSION`. The provider preserves all
   * user-selected config and only re-asserts the platform overlay. Failures are
   * logged and swallowed so message dispatch is never blocked.
   */
  async reconcileIfStale(params: AgentRuntimeDefinitionReconcileParams): Promise<void> {
    // Fail-open across the whole flow: a transient DB/credential error must never block
    // the user's message. Any failure (load, integration lookup, resolve, provider push,
    // stamp) is logged and swallowed.
    try {
      const agent = await this.loadManagedAgent(params);

      if (!agent || !this.isDefinitionStale(agent)) {
        return;
      }

      const { providerId, _integrationId, externalAgentId } = agent.managedRuntime;

      const integration = await this.integrationRepository.findOne(
        {
          _id: _integrationId,
          _environmentId: params.environmentId,
          _organizationId: params.organizationId,
        },
        ['credentials']
      );

      if (!integration) {
        this.logger.warn(
          { agentId: params.agentId, integrationId: _integrationId },
          'Managed definition reconcile skipped: runtime integration not found'
        );

        return;
      }

      const resolved = resolveAgentRuntime(providerId, integration.credentials);

      if (!resolved) {
        this.logger.warn(
          { agentId: params.agentId, providerId },
          'Managed definition reconcile skipped: integration has no API key configured'
        );

        return;
      }

      await resolved.provider.refreshPlatformDefinition(externalAgentId);
      await this.markDefinitionSynced(agent, params);
    } catch (err) {
      this.logger.warn(
        { err, agentId: params.agentId },
        'Managed definition reconcile failed; continuing without blocking the message'
      );
    }
  }

  private async loadManagedAgent(params: AgentRuntimeDefinitionReconcileParams): Promise<ManagedAgent | null> {
    const agent = await this.agentRepository.findOne(
      {
        _id: params.agentId,
        _environmentId: params.environmentId,
        _organizationId: params.organizationId,
      },
      ['_id', 'runtime', 'managedRuntime']
    );

    if (!agent?.managedRuntime || agent.runtime !== 'managed') {
      return null;
    }

    return agent as ManagedAgent;
  }

  private isDefinitionStale(agent: ManagedAgent): boolean {
    const syncedVersion = agent.managedRuntime.managedDefinitionVersion ?? 0;

    return syncedVersion < AGENT_MANAGED_DEFINITION_VERSION;
  }

  private async markDefinitionSynced(
    agent: ManagedAgent,
    params: AgentRuntimeDefinitionReconcileParams
  ): Promise<void> {
    await this.agentRepository.update(
      {
        _id: agent._id,
        _environmentId: params.environmentId,
        _organizationId: params.organizationId,
      },
      {
        $set: {
          'managedRuntime.managedDefinitionVersion': AGENT_MANAGED_DEFINITION_VERSION,
        },
      }
    );
  }
}
