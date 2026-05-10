import { Injectable, NotFoundException } from '@nestjs/common';
import { decryptCredentials, getAgentRuntimeProvider, PinoLogger } from '@novu/application-generic';
import { AgentRepository, IntegrationRepository } from '@novu/dal';
import { ProvisionManagedAgentCommand } from './provision-managed-agent.command';

@Injectable()
export class ProvisionManagedAgent {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly logger: PinoLogger
  ) {}

  async execute(command: ProvisionManagedAgentCommand): Promise<{ externalAgentId: string }> {
    const integration = await this.integrationRepository.findOne(
      {
        _id: command.integrationId,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      ['_id', 'credentials', 'providerId']
    );

    if (!integration) {
      throw new NotFoundException(`Integration "${command.integrationId}" not found.`);
    }

    const decryptedCredentials = decryptCredentials(integration.credentials);
    const apiKey = decryptedCredentials.apiKey;

    if (!apiKey) {
      throw new NotFoundException(`Integration "${command.integrationId}" has no API key configured.`);
    }

    const runtimeProvider = getAgentRuntimeProvider(command.providerId, apiKey);

    // Validate credentials before provisioning
    await runtimeProvider.validateCredentials(apiKey);

    // Provision the agent on Claude Platform
    const { externalAgentId } = await runtimeProvider.createAgent({
      name: command.name,
      model: command.model,
      systemPrompt: command.systemPrompt,
    });

    // Persist the managed runtime identifiers on the agent
    // If this update fails, roll back the Claude agent to avoid orphans
    try {
      await this.agentRepository.update(
        {
          _id: command.agentId,
          _environmentId: command.environmentId,
          _organizationId: command.organizationId,
        },
        {
          $set: {
            runtime: 'managed',
            managedRuntime: {
              providerId: command.providerId,
              _integrationId: command.integrationId,
              externalAgentId,
            },
          },
        }
      );
    } catch (mongoError) {
      // Best-effort rollback: attempt to delete the agent we just created
      try {
        await runtimeProvider.deleteAgent(externalAgentId);
      } catch (rollbackError) {
        this.logger.error(
          {
            agentId: command.agentId,
            externalAgentId,
            providerId: command.providerId,
            rollbackError,
          },
          'Failed to rollback Claude agent after Mongo write failure — manual cleanup required'
        );
      }
      throw mongoError;
    }

    return { externalAgentId };
  }
}
