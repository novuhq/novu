import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { AnalyticsService, decryptCredentials, getAgentRuntimeProvider } from '@novu/application-generic';
import type { ManagedRuntimeConfig } from '@novu/dal';
import { AgentIntegrationRepository, AgentRepository, IntegrationRepository } from '@novu/dal';
import type { AgentRuntime } from '@novu/shared';

import { trackAgentDeleted } from '../../agent-analytics';
import { CleanupNovuEmail } from '../cleanup-novu-email/cleanup-novu-email.usecase';
import { DeleteAgentCommand } from './delete-agent.command';

function scopedManagedRuntimeForProviderDelete(agent: {
  runtime?: AgentRuntime;
  managedRuntime?: ManagedRuntimeConfig;
}): ManagedRuntimeConfig | null {
  const { managedRuntime } = agent;

  if (agent.runtime === 'self-hosted' || !managedRuntime?.externalAgentId || !managedRuntime._integrationId) {
    return null;
  }

  return managedRuntime;
}

@Injectable()
export class DeleteAgent {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly cleanupNovuEmail: CleanupNovuEmail,
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

    const managedRuntimeForDeletion = scopedManagedRuntimeForProviderDelete(agent);

    if (shouldDeleteFromProvider && agent.runtime === 'managed' && !managedRuntimeForDeletion) {
      throw new UnprocessableEntityException(
        'This managed runtime agent record is missing provider linkage. Uncheck delete-from-provider or fix the agent, then retry.'
      );
    }

    if (shouldDeleteFromProvider && managedRuntimeForDeletion) {
      await this.deleteFromProvider(managedRuntimeForDeletion, command);
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
    const integration = await this.integrationRepository.findOne(
      {
        _id: managedRuntime._integrationId,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      ['credentials']
    );

    if (!integration) {
      throw new NotFoundException(
        `Integration "${managedRuntime._integrationId}" was not found. The managed agent cannot be archived on the provider without that integration; fix or remove the linkage, or retry without delete-from-provider if you only need to remove the Novu record.`
      );
    }

    const decryptedCredentials = decryptCredentials(integration.credentials);

    if (!decryptedCredentials.apiKey) {
      throw new UnprocessableEntityException(
        `Integration "${managedRuntime._integrationId}" has no API key configured, so we cannot archive the managed agent upstream. Restore credentials or omit delete-from-provider.`
      );
    }

    const runtimeProvider = getAgentRuntimeProvider(managedRuntime.providerId, decryptedCredentials.apiKey);

    await runtimeProvider.deleteAgent(managedRuntime.externalAgentId);
  }
}
