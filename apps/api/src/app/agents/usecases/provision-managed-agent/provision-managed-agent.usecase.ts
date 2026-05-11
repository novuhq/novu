import { Injectable, NotFoundException } from '@nestjs/common';
import { decryptCredentials, getAgentRuntimeProvider, PinoLogger } from '@novu/application-generic';
import { AgentRepository, IntegrationRepository } from '@novu/dal';
import { CLAUDE_MCP_SERVERS } from '@novu/shared';
import type { ClientSession } from 'mongoose';
import { ProvisionManagedAgentCommand } from './provision-managed-agent.command';

export type ProvisionManagedAgentOptions = {
  session: ClientSession | null;
};

@Injectable()
export class ProvisionManagedAgent {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly logger: PinoLogger
  ) {}

  async execute(
    command: ProvisionManagedAgentCommand,
    options: ProvisionManagedAgentOptions
  ): Promise<{ externalAgentId: string }> {
    const { session } = options;

    const integration = await this.integrationRepository.findOne(
      {
        _id: command.integrationId,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      ['_id', 'credentials', 'providerId'],
      session ? { session } : {}
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

    const resolvedMcpServers = command.mcpServers?.map((serverId) => {
      const catalogServer = CLAUDE_MCP_SERVERS.find((s) => s.id === serverId);

      return { name: catalogServer?.name ?? serverId, url: catalogServer?.url ?? '' };
    });

    const response = await runtimeProvider.createAgent({
      name: command.name,
      model: command.model,
      systemPrompt: command.systemPrompt,
      tools: command.tools,
      mcpServers: resolvedMcpServers,
      skills: command.skills,
    });

    const { externalAgentId } = response;

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
        },
        session ? { session } : {}
      );
    } catch (mongoError) {
      this.logger.error({ err: mongoError }, 'Failed to persist managed runtime on agent after provisioning');
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
