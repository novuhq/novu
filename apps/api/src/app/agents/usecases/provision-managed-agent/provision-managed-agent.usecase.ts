import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { decryptCredentials, encryptCredentials, getAgentRuntimeProvider, PinoLogger } from '@novu/application-generic';
import { AgentRepository, IntegrationRepository } from '@novu/dal';
import type { ClientSession } from 'mongoose';
import { resolveMcpServersById } from '../../utils/resolve-mcp-servers';
import { ProvisionManagedAgentCommand } from './provision-managed-agent.command';

export type ProvisionManagedAgentOptions = {
  session: ClientSession | null;
};

export type ProvisionManagedAgentResult = {
  externalAgentId: string;
  /** Resolved Novu integration ID. */
  integrationId: string;
  /** The agent's name as returned by the provider. Present only in adoption mode. */
  adoptedName?: string;
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
  ): Promise<ProvisionManagedAgentResult> {
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

    if (!decryptedCredentials.apiKey) {
      throw new UnprocessableEntityException(
        `Integration "${command.integrationId}" has no API key configured. Please complete the integration setup.`
      );
    }

    const resolvedIntegrationId = integration._id;
    const resolvedApiKey = decryptedCredentials.apiKey;

    const runtimeProvider = getAgentRuntimeProvider(command.providerId, resolvedApiKey);

    if (command.externalEnvironmentId && command.externalEnvironmentId !== decryptedCredentials.externalEnvironmentId) {
      const providerEnvironment = await runtimeProvider.getEnvironment(command.externalEnvironmentId);
      const nextCredentials = encryptCredentials({
        ...decryptedCredentials,
        externalEnvironmentId: providerEnvironment.id,
      });

      await this.integrationRepository.update(
        {
          _id: resolvedIntegrationId,
          _environmentId: command.environmentId,
          _organizationId: command.organizationId,
        },
        { $set: { credentials: nextCredentials } },
        session ? { session } : {}
      );
    }

    let externalAgentId: string;
    let adoptedName: string | undefined;

    if (command.externalAgentId) {
      // ── Adopt mode ────────────────────────────────────────────────────────
      // A single getAgent() call validates both auth (401) and existence (404).
      const agentInfo = await runtimeProvider.getAgent(command.externalAgentId);

      externalAgentId = agentInfo.externalAgentId;
      adoptedName = agentInfo.name;
    } else {
      // ── Provision mode ────────────────────────────────────────────────────
      await runtimeProvider.validateCredentials(resolvedApiKey);

      const resolvedMcpServers = command.mcpServers ? resolveMcpServersById(command.mcpServers) : undefined;

      const response = await runtimeProvider.createAgent({
        name: command.name ?? '',
        model: command.model,
        systemPrompt: command.systemPrompt,
        tools: command.tools,
        mcpServers: resolvedMcpServers,
        skills: command.skills,
      });

      externalAgentId = response.externalAgentId;
    }

    // Persist the managed runtime identifiers on the agent.
    try {
      const updateResult = await this.agentRepository.update(
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
              _integrationId: resolvedIntegrationId,
              externalAgentId,
            },
          },
        },
        session ? { session } : {}
      );

      if (updateResult?.matched === 0) {
        throw new Error(
          `Agent "${command.agentId}" no longer exists; aborting managed-runtime provision to avoid orphaning the provider resource.`
        );
      }
    } catch (mongoError) {
      this.logger.error({ err: mongoError }, 'Failed to persist managed runtime on agent after provisioning');

      if (!command.externalAgentId) {
        // Best-effort rollback the provider agent we just created.
        try {
          await runtimeProvider.deleteAgent(externalAgentId);
        } catch (rollbackError) {
          this.logger.error(
            { agentId: command.agentId, externalAgentId, providerId: command.providerId, rollbackError },
            'Failed to rollback provider agent after Mongo write failure — manual cleanup required'
          );
        }
      }

      throw mongoError;
    }

    return { externalAgentId, integrationId: resolvedIntegrationId, adoptedName };
  }
}
