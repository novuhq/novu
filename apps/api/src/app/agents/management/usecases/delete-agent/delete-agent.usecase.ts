import { Injectable, NotFoundException } from '@nestjs/common';
import { AnalyticsService, resolveAgentRuntime } from '@novu/application-generic';
import { AgentIntegrationRepository, AgentRepository, IntegrationRepository } from '@novu/dal';
import { AgentRuntimeProviderIdEnum } from '@novu/shared';
import { NovuEmailCleanupService } from '../../../email/novu-email/cleanup-novu-email/cleanup-novu-email.service';
import { trackAgentDeleted } from '../../../shared/analytics/agent-analytics';
import { DeleteAgentCommand } from './delete-agent.command';

@Injectable()
export class DeleteAgent {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly cleanupNovuEmail: NovuEmailCleanupService,
    private readonly analyticsService: AnalyticsService
  ) {}

  async execute(command: DeleteAgentCommand): Promise<void> {
    const agent = await this.agentRepository.findOne(
      {
        identifier: command.identifier,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      ['_id', 'runtime', 'managedRuntime']
    );

    if (!agent) {
      throw new NotFoundException(`Agent with identifier "${command.identifier}" was not found.`);
    }

    const shouldDeleteFromProvider = command.deleteFromProvider === true;

    if (agent.runtime === 'managed' && agent.managedRuntime && shouldDeleteFromProvider) {
      await this.deleteFromProvider(agent.managedRuntime, command);
    }

    await this.agentRepository.withTransaction(async (session) => {
      await this.cleanupNovuEmail.cleanupForAgent(agent._id, command.environmentId, command.organizationId, session);

      await this.agentIntegrationRepository.delete(
        {
          _agentId: agent._id,
          _environmentId: command.environmentId,
          _organizationId: command.organizationId,
        },
        { session }
      );

      await this.agentRepository.delete(
        {
          _id: agent._id,
          _environmentId: command.environmentId,
          _organizationId: command.organizationId,
        },
        { session }
      );
    });

    trackAgentDeleted(this.analyticsService, {
      userId: command.userId,
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      agentId: agent._id,
      agentIdentifier: command.identifier,
    });
  }

  private async deleteFromProvider(
    managedRuntime: { providerId: string; _integrationId: string; externalAgentId: string },
    command: DeleteAgentCommand
  ): Promise<void> {
    // Demo agents share Novu's Anthropic account; upstream archive is skipped to avoid
    // cross-tenant deletes when a foreign externalAgentId is linked. Orphans are
    // cleaned up by platform maintenance.
    if (managedRuntime.providerId === AgentRuntimeProviderIdEnum.NovuAnthropic) {
      return;
    }

    const integration = await this.integrationRepository.findOne(
      {
        _id: managedRuntime._integrationId,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      ['credentials']
    );

    if (!integration) {
      return;
    }

    const resolved = resolveAgentRuntime(managedRuntime.providerId, integration.credentials);

    if (!resolved) {
      return;
    }

    await resolved.provider.deleteAgent(managedRuntime.externalAgentId);
  }
}
