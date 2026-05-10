import { Injectable, NotFoundException } from '@nestjs/common';
import { AnalyticsService, decryptCredentials, getAgentRuntimeProvider, PinoLogger } from '@novu/application-generic';
import { AgentIntegrationRepository, AgentRepository, IntegrationRepository } from '@novu/dal';

import { trackAgentDeleted } from '../../agent-analytics';
import { CleanupNovuEmail } from '../cleanup-novu-email/cleanup-novu-email.usecase';
import { DeleteAgentCommand } from './delete-agent.command';

@Injectable()
export class DeleteAgent {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly cleanupNovuEmail: CleanupNovuEmail,
    private readonly analyticsService: AnalyticsService,
    private readonly logger: PinoLogger
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

    const isManagedAgent = agent.runtime === 'managed' && agent.managedRuntime;

    if (isManagedAgent) {
      // Soft-delete: mark as pending external deletion, then clean up provider-side async
      await this.agentRepository.update(
        {
          _id: agent._id,
          _environmentId: command.environmentId,
          _organizationId: command.organizationId,
        },
        {
          $set: {
            deletedAt: new Date().toISOString(),
            pendingExternalDelete: true,
          },
        }
      );

      // Attempt provider-side delete; hard-delete locally on success
      this.deleteExternalAgent(agent._id, agent.managedRuntime!, command).catch((err) => {
        this.logger.error({ agentId: agent._id, err }, 'Background Claude agent deletion failed — will retry');
      });
    } else {
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
    }

    trackAgentDeleted(this.analyticsService, {
      userId: command.userId,
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      agentId: agent._id,
      agentIdentifier: command.identifier,
    });
  }

  private async deleteExternalAgent(
    agentId: string,
    managedRuntime: { providerId: string; _integrationId: string; externalAgentId: string },
    command: DeleteAgentCommand
  ): Promise<void> {
    const integration = await this.integrationRepository.findOne(
      {
        _id: managedRuntime._integrationId,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      ['credentials']
    );

    if (integration) {
      const decryptedCredentials = decryptCredentials(integration.credentials);
      const runtimeProvider = getAgentRuntimeProvider(managedRuntime.providerId, decryptedCredentials.apiKey!);
      await runtimeProvider.deleteAgent(managedRuntime.externalAgentId);
    }

    // Hard-delete agent and its integration links once the provider confirms
    await this.agentRepository.withTransaction(async (session) => {
      await this.cleanupNovuEmail.cleanupForAgent(agentId, command.environmentId, command.organizationId, session);

      await this.agentIntegrationRepository.delete(
        {
          _agentId: agentId,
          _environmentId: command.environmentId,
          _organizationId: command.organizationId,
        },
        { session }
      );

      await this.agentRepository.delete(
        {
          _id: agentId,
          _environmentId: command.environmentId,
          _organizationId: command.organizationId,
        },
        { session }
      );
    });
  }
}
