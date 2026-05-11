import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  decryptCredentials,
  encryptCredentials,
  getAgentRuntimeProvider,
  type IAgentRuntimeProvider,
  PinoLogger,
} from '@novu/application-generic';
import { AgentRepository, IntegrationRepository } from '@novu/dal';
import { ChannelTypeEnum, CLAUDE_MCP_SERVERS } from '@novu/shared';
import type { ClientSession } from 'mongoose';
import shortid from 'shortid';
import { ProvisionManagedAgentCommand } from './provision-managed-agent.command';

export type ProvisionManagedAgentOptions = {
  session: ClientSession | null;
};

export type ProvisionManagedAgentResult = {
  externalAgentId: string;
  /** Resolved Novu integration ID (may be newly created when apiKey was supplied). */
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

    if (!command.integrationId && !command.apiKey) {
      throw new BadRequestException('Either integrationId or apiKey must be provided.');
    }

    let resolvedIntegrationId: string;
    let resolvedApiKey: string;
    let createdIntegrationId: string | undefined;
    let createdExternalEnvironmentId: string | undefined;

    if (command.apiKey) {
      // ── Auto-provision Integration + Environment ─────────────────────────────
      // The caller supplied a raw API key. Create the Novu Integration record,
      // then create the Claude environment and store its ID on the integration.
      const integrationName = `${command.providerId}-${shortid.generate()}`;
      const integrationIdentifier = integrationName;

      const createdIntegration = await this.integrationRepository.create(
        {
          name: integrationName,
          identifier: integrationIdentifier,
          _environmentId: command.environmentId,
          _organizationId: command.organizationId,
          providerId: command.providerId as string,
          channel: ChannelTypeEnum.AGENT_RUNTIME,
          credentials: encryptCredentials({ apiKey: command.apiKey }),
          active: true,
          priority: 1,
          primary: false,
          deleted: false,
        },
        session ? { session } : {}
      );

      createdIntegrationId = createdIntegration._id;
      resolvedIntegrationId = createdIntegration._id;
      resolvedApiKey = command.apiKey;

      // Create the Claude environment (1:1 with the integration).
      const runtimeProviderForEnv = getAgentRuntimeProvider(command.providerId, resolvedApiKey);
      const envName = `nv-${integrationIdentifier}`;

      try {
        const envResult = await runtimeProviderForEnv.createEnvironment({ name: envName });

        createdExternalEnvironmentId = envResult.externalEnvironmentId;

        // Persist the environment ID on the integration credentials.
        const encryptedWithEnv = encryptCredentials({
          apiKey: command.apiKey,
          externalEnvironmentId: envResult.externalEnvironmentId,
        });

        await this.integrationRepository.update(
          {
            _id: resolvedIntegrationId,
            _environmentId: command.environmentId,
            _organizationId: command.organizationId,
          },
          { $set: { credentials: encryptedWithEnv } },
          session ? { session } : {}
        );
      } catch (envError) {
        this.logger.error(
          { err: envError, integrationId: resolvedIntegrationId, providerId: command.providerId },
          'Failed to create Claude environment during provisioning'
        );
        throw envError;
      }
    } else {
      // ── Use existing Integration ─────────────────────────────────────────────
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
        throw new NotFoundException(`Integration "${command.integrationId}" has no API key configured.`);
      }

      resolvedIntegrationId = integration._id;
      resolvedApiKey = decryptedCredentials.apiKey;
    }

    const runtimeProvider = getAgentRuntimeProvider(command.providerId, resolvedApiKey);

    let externalAgentId: string;
    let adoptedName: string | undefined;

    try {
      if (command.externalAgentId) {
        // ── Adopt mode ────────────────────────────────────────────────────────
        // A single getAgent() call validates both auth (401) and existence (404).
        const agentInfo = await runtimeProvider.getAgent(command.externalAgentId);

        externalAgentId = agentInfo.externalAgentId;
        adoptedName = agentInfo.name;
      } else {
        // ── Provision mode ────────────────────────────────────────────────────
        // When using an existing integration we validate credentials first.
        if (!command.apiKey) {
          await runtimeProvider.validateCredentials(resolvedApiKey);
        }

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
    } catch (providerError) {
      // Roll back the auto-created integration + environment if we created them.
      await this.rollbackIntegrationAndEnvironment(
        createdIntegrationId,
        createdExternalEnvironmentId,
        command,
        runtimeProvider
      );
      throw providerError;
    }

    // Persist the managed runtime identifiers on the agent.
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
              _integrationId: resolvedIntegrationId,
              externalAgentId,
            },
          },
        },
        session ? { session } : {}
      );
    } catch (mongoError) {
      this.logger.error({ err: mongoError }, 'Failed to persist managed runtime on agent after provisioning');

      if (!command.externalAgentId) {
        // Best-effort rollback the Claude agent we just created.
        try {
          await runtimeProvider.deleteAgent(externalAgentId);
        } catch (rollbackError) {
          this.logger.error(
            { agentId: command.agentId, externalAgentId, providerId: command.providerId, rollbackError },
            'Failed to rollback Claude agent after Mongo write failure — manual cleanup required'
          );
        }
      }

      // Also roll back integration + environment if they were auto-created.
      await this.rollbackIntegrationAndEnvironment(
        createdIntegrationId,
        createdExternalEnvironmentId,
        command,
        runtimeProvider
      );

      throw mongoError;
    }

    return { externalAgentId, integrationId: resolvedIntegrationId, adoptedName };
  }

  private async rollbackIntegrationAndEnvironment(
    createdIntegrationId: string | undefined,
    createdExternalEnvironmentId: string | undefined,
    command: ProvisionManagedAgentCommand,
    runtimeProvider: IAgentRuntimeProvider
  ): Promise<void> {
    if (!createdIntegrationId) {
      return;
    }

    if (createdExternalEnvironmentId) {
      try {
        await runtimeProvider.archiveEnvironment(createdExternalEnvironmentId);
      } catch (envRollbackError) {
        this.logger.error(
          {
            externalEnvironmentId: createdExternalEnvironmentId,
            providerId: command.providerId,
            err: envRollbackError,
          },
          'Failed to archive Claude environment during rollback — manual cleanup required'
        );
      }
    }

    try {
      await this.integrationRepository.delete({
        _id: createdIntegrationId,
        _organizationId: command.organizationId,
      });
    } catch (intgRollbackError) {
      this.logger.error(
        { integrationId: createdIntegrationId, err: intgRollbackError },
        'Failed to delete auto-created integration during rollback — manual cleanup required'
      );
    }
  }
}
