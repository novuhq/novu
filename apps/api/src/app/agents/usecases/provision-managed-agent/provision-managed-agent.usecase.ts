import { Injectable, NotFoundException } from '@nestjs/common';
import { decryptCredentials, getAgentRuntimeProvider, PinoLogger } from '@novu/application-generic';
import { AgentRepository, IntegrationRepository } from '@novu/dal';
import { CLAUDE_MCP_SERVERS } from '@novu/shared';
import type { ClientSession } from 'mongoose';
import { ProvisionManagedAgentCommand } from './provision-managed-agent.command';

export type ProvisionManagedAgentOptions = {
  session: ClientSession | null;
};

export type ProvisionManagedAgentResult = {
  externalAgentId: string;
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
    const apiKey = decryptedCredentials.apiKey;

    if (!apiKey) {
      throw new NotFoundException(`Integration "${command.integrationId}" has no API key configured.`);
    }

    const runtimeProvider = getAgentRuntimeProvider(command.providerId, apiKey);

    let externalAgentId: string;
    let adoptedName: string | undefined;

    if (command.externalAgentId) {
      // ── Adopt mode ──────────────────────────────────────────────────────────
      // A single getAgent() call is sufficient to validate both that the API key
      // is authorised (throws AgentRuntimeUnauthorizedError on 401) AND that the
      // external agent exists (throws AgentRuntimeNotFoundError on 404). There is
      // no need to call validateCredentials() separately.
      const agentInfo = await runtimeProvider.getAgent(command.externalAgentId);

      externalAgentId = agentInfo.externalAgentId;
      adoptedName = agentInfo.name;
    } else {
      // ── Provision mode ───────────────────────────────────────────────────────
      // Validate credentials before creating a new agent on the provider.
      await runtimeProvider.validateCredentials(apiKey);

      const resolvedMcpServers = command.mcpServers?.map((serverId) => {
        const catalogServer = CLAUDE_MCP_SERVERS.find((s) => s.id === serverId);

        return { name: catalogServer?.name ?? serverId, url: catalogServer?.url ?? '' };
      });

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
    // If this update fails and we just created a new provider agent, roll it back.
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

      if (!command.externalAgentId) {
        // Best-effort rollback: only delete if we created the agent (not adoption)
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
      }

      throw mongoError;
    }

    return { externalAgentId, adoptedName };
  }
}
