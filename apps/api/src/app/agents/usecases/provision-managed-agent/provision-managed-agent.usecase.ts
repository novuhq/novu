import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { decryptCredentials, encryptCredentials, getAgentRuntimeProvider, PinoLogger } from '@novu/application-generic';
import { AgentMcpServerRepository, AgentRepository, IntegrationRepository } from '@novu/dal';
import { MCP_SERVERS, McpConnectionScopeEnum } from '@novu/shared';
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
    private readonly agentMcpServerRepository: AgentMcpServerRepository,
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

    // Snapshot the pre-update runtime fields so we can compensate when the
    // post-managed-runtime writes fail and we are NOT inside a Mongo
    // transaction (i.e. `session === null`). With a session, the caller's
    // transaction rolls everything back automatically — without one, every
    // write here is independently committed and we have to undo by hand.
    const previousAgentRuntime = !session
      ? await this.agentRepository.findOne(
          {
            _id: command.agentId,
            _environmentId: command.environmentId,
            _organizationId: command.organizationId,
          },
          ['runtime', 'managedRuntime']
        )
      : null;

    let agentRuntimePersisted = false;

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

      agentRuntimePersisted = true;

      // Mongo is the source of truth for the agent's MCP list. Mirror the
      // initial set sent to the provider as `agent_mcp_server` rows so the
      // dashboard and runtime config endpoints can read them directly.
      // In adopt mode we do not know the authoritative set on the provider
      // until a separate reconcile step (out of scope here), so skip
      // seeding to avoid writing rows that disagree with the provider.
      if (!command.externalAgentId && command.mcpServers?.length) {
        await this.persistAgentMcpServers(command, session);
      }
    } catch (mongoError) {
      this.logger.error({ err: mongoError }, 'Failed to persist managed runtime on agent after provisioning');

      // Compensating Mongo rollback for the no-session path: if the runtime
      // update already committed but the MCP seeding failed, the agent row
      // would otherwise be left pointing at a provider agent we're about to
      // delete below. Revert it to its pre-update shape so the row matches
      // reality. With a session, the caller's transaction handles this.
      if (agentRuntimePersisted && !session) {
        try {
          await this.agentRepository.update(
            {
              _id: command.agentId,
              _environmentId: command.environmentId,
              _organizationId: command.organizationId,
            },
            {
              $set: {
                runtime: previousAgentRuntime?.runtime ?? null,
                managedRuntime: previousAgentRuntime?.managedRuntime ?? null,
              },
            }
          );
        } catch (revertError) {
          this.logger.error(
            { agentId: command.agentId, err: revertError },
            'Failed to revert agent runtime fields after provisioning failure — manual cleanup may be required'
          );
        }
      }

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

  private async persistAgentMcpServers(
    command: ProvisionManagedAgentCommand,
    session: ClientSession | null
  ): Promise<void> {
    if (!command.mcpServers?.length) {
      return;
    }

    const syncedAt = new Date();
    const writeOptions = session ? { session } : {};

    for (const mcpId of command.mcpServers) {
      const catalog = MCP_SERVERS.find((entry) => entry.id === mcpId);

      if (!catalog || !catalog.oauth) {
        // Skip MCPs that aren't in the catalog or don't yet have OAuth
        // wiring — they can't be persisted as `defaultAuthMode` would be
        // ambiguous and they would never be reachable from the dashboard.
        continue;
      }

      await this.agentMcpServerRepository.create(
        {
          _organizationId: command.organizationId,
          _environmentId: command.environmentId,
          _agentId: command.agentId,
          mcpId,
          enabled: true,
          defaultScope: McpConnectionScopeEnum.Subscriber,
          defaultAuthMode: catalog.oauth.mode,
          status: 'active',
          externalProjection: {
            providerId: command.providerId,
            mcpServerName: catalog.name,
            syncedAt,
          },
        },
        writeOptions
      );
    }
  }
}
