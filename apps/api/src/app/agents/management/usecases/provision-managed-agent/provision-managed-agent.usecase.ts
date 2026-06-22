import { BadRequestException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import {
  areNovuManagedClaudeCredentialsSet,
  decryptCredentials,
  encryptCredentials,
  getAgentRuntimeProvider,
  getNovuManagedClaudeApiKey,
  PinoLogger,
  type ResolvedAgentRuntime,
  resolveAgentRuntime,
} from '@novu/application-generic';
import { AgentMcpServerRepository, AgentRepository, IntegrationRepository } from '@novu/dal';
import {
  AGENT_MANAGED_DEFINITION_VERSION,
  AgentRuntimeProviderIdEnum,
  filterDemoConfigurableMcpIds,
  type ICredentialsDto,
  MCP_SERVERS,
  McpConnectionScopeEnum,
} from '@novu/shared';
import type { ClientSession } from 'mongoose';
import { AgentMcpDefinitionService } from '../../../mcp/runtime/agent-mcp-definition.service';
import { resolveMcpServersById, resolveProviderMcpServerIds } from '../../../mcp/shared/resolve-mcp-servers';
import { sanitizeUrlForLogging } from '../../../mcp/shared/sanitize-url-for-logging';
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
    private readonly agentMcpDefinitionService: AgentMcpDefinitionService,
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
      ['_id', 'credentials', 'providerId', 'name'],
      session ? { session } : {}
    );

    if (!integration) {
      throw new NotFoundException(`Integration "${command.integrationId}" not found.`);
    }

    this.assertDemoIntegrationAdoptAllowed(integration.providerId, command);

    const resolved = await this.ensureCredentialsProvisioned(integration, command, session);
    const { credentials: decryptedCredentials, provider: runtimeProvider, validateCredentialsInput } = resolved;

    const resolvedIntegrationId = integration._id;
    const runtimeProviderId = integration.providerId as AgentRuntimeProviderIdEnum;

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
    // Catalog ids (e.g. "slack") to seed `agent_mcp_server` rows with. In
    // provision mode this is exactly what the caller passed. In adopt mode
    // we derive it from the provider's live MCP server list so Mongo mirrors
    // whatever is already wired upstream.
    let mcpIdsToPersist: string[] | undefined;

    if (command.externalAgentId) {
      // ── Adopt mode ────────────────────────────────────────────────────────
      // getAgent() validates both auth (401) and existence (404). Run it in
      // parallel with getConfig() so the extra round-trip needed to fetch the
      // upstream MCP list doesn't add to total latency. If either rejects,
      // Promise.all surfaces the same `AgentRuntime*Error` shapes the caller
      // already handles.
      const [agentInfo, providerConfig] = await Promise.all([
        runtimeProvider.getAgent(command.externalAgentId),
        runtimeProvider.getConfig(command.externalAgentId),
      ]);

      externalAgentId = agentInfo.externalAgentId;
      adoptedName = agentInfo.name;

      const { matchedIds, unmatched } = resolveProviderMcpServerIds(providerConfig.mcpServers ?? []);
      mcpIdsToPersist = matchedIds;

      if (unmatched.length > 0) {
        this.logger.warn(
          {
            agentId: command.agentId,
            externalAgentId,
            providerId: runtimeProviderId,
            unmatched: unmatched.map((entry) => ({
              name: entry.name,
              url: entry.url ? sanitizeUrlForLogging(entry.url) : entry.url,
            })),
          },
          `Dropping ${unmatched.length} provider MCP server(s) with no matching catalog entry during adoption. ` +
            'Rows are skipped so Mongo never points at servers Novu cannot render in the picker.'
        );
      }
    } else {
      // ── Provision mode ────────────────────────────────────────────────────
      await runtimeProvider.validateCredentials(validateCredentialsInput);

      // The Novu-managed demo integration exposes no provider vault, so provider-managed MCPs can
      // never be connected on it. Drop them here so we mirror the dashboard's demo filtering and
      // never wire a demo agent to a server the user could not finish authorizing.
      const requestedMcpServers =
        command.mcpServers && runtimeProviderId === AgentRuntimeProviderIdEnum.NovuAnthropic
          ? filterDemoConfigurableMcpIds(command.mcpServers)
          : command.mcpServers;

      if (requestedMcpServers?.length) {
        resolveMcpServersById(requestedMcpServers);
      }

      const agentDefinitionMcpIds = requestedMcpServers
        ? this.agentMcpDefinitionService.filterIdsForProvision(requestedMcpServers, McpConnectionScopeEnum.Subscriber)
        : undefined;
      // Shared agent only at create time; Mongo still stores every requested MCP below.
      const resolvedMcpServers = agentDefinitionMcpIds?.length
        ? resolveMcpServersById(agentDefinitionMcpIds)
        : undefined;
      const response = await runtimeProvider.createAgent({
        name: command.name ?? '',
        model: command.model,
        systemPrompt: command.systemPrompt,
        tools: command.tools,
        mcpServers: resolvedMcpServers,
        skills: command.skills,
      });

      externalAgentId = response.externalAgentId;
      mcpIdsToPersist = requestedMcpServers;
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
              providerId: runtimeProviderId,
              _integrationId: resolvedIntegrationId,
              externalAgentId,
              // Set managedDefinitionVersion only for provisioned agents
              ...(command.externalAgentId ? {} : { managedDefinitionVersion: AGENT_MANAGED_DEFINITION_VERSION }),
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
      // catalog ids resolved above as `agent_mcp_server` rows so the
      // dashboard and runtime config endpoints can read them directly. In
      // provision mode this is the set we just sent to the provider; in
      // adopt mode it's what the provider reported back, projected onto the
      // catalog. Either way, Mongo never silently disagrees with upstream.
      if (mcpIdsToPersist?.length) {
        await this.persistAgentMcpServers(mcpIdsToPersist, command, session);
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

  private assertDemoIntegrationAdoptAllowed(providerId: string, command: ProvisionManagedAgentCommand): void {
    if (providerId !== AgentRuntimeProviderIdEnum.NovuAnthropic) {
      return;
    }

    if (command.externalAgentId) {
      throw new BadRequestException(
        'Adopting an existing provider agent is not supported on the Novu managed Claude demo integration.'
      );
    }

    if (command.externalEnvironmentId) {
      throw new BadRequestException(
        'Adopting an existing provider environment is not supported on the Novu managed Claude demo integration.'
      );
    }
  }

  private async ensureCredentialsProvisioned(
    integration: { _id: string; credentials?: ICredentialsDto; providerId: string; name?: string },
    command: ProvisionManagedAgentCommand,
    session: ClientSession | null
  ): Promise<ResolvedAgentRuntime> {
    const isNovuManagedClaude = integration.providerId === AgentRuntimeProviderIdEnum.NovuAnthropic;

    if (isNovuManagedClaude) {
      if (!areNovuManagedClaudeCredentialsSet()) {
        throw new UnprocessableEntityException('Novu managed Claude credentials are not configured.');
      }

      const resolvedApiKey = getNovuManagedClaudeApiKey();
      let decryptedCredentials = decryptCredentials(integration.credentials ?? {});

      if (!decryptedCredentials.externalEnvironmentId) {
        const provisioningProvider = getAgentRuntimeProvider(AgentRuntimeProviderIdEnum.NovuAnthropic, resolvedApiKey);
        const provisionResult = await provisioningProvider.provisionIntegration({
          integrationName: integration.name ?? 'Novu Managed Claude',
          resourceName: command.organizationId,
        });
        const nextCredentials = encryptCredentials({
          ...decryptedCredentials,
          ...provisionResult.credentialsUpdate,
        });

        await this.integrationRepository.update(
          {
            _id: integration._id,
            _environmentId: command.environmentId,
            _organizationId: command.organizationId,
          },
          { $set: { credentials: nextCredentials } },
          session ? { session } : {}
        );

        decryptedCredentials = decryptCredentials(nextCredentials);
      }

      return {
        apiKey: resolvedApiKey,
        credentials: decryptedCredentials,
        provider: getAgentRuntimeProvider(AgentRuntimeProviderIdEnum.NovuAnthropic, resolvedApiKey),
        validateCredentialsInput: { apiKey: resolvedApiKey },
      };
    }

    const resolved = resolveAgentRuntime(integration.providerId, integration.credentials);

    if (!resolved) {
      throw new UnprocessableEntityException(
        `Integration "${command.integrationId}" has incomplete credentials. Please complete the integration setup.`
      );
    }

    return resolved;
  }

  private async persistAgentMcpServers(
    mcpIds: string[],
    command: ProvisionManagedAgentCommand,
    session: ClientSession | null
  ): Promise<void> {
    if (!mcpIds.length) {
      return;
    }

    const syncedAt = new Date();
    const writeOptions = session ? { session } : {};

    for (const mcpId of mcpIds) {
      const catalog = MCP_SERVERS.find((entry) => entry.id === mcpId);

      if (!catalog || !catalog.oauth) {
        // Skip MCPs that aren't in the catalog or don't yet have OAuth
        // wiring — they can't be persisted as `defaultAuthMode` would be
        // ambiguous and they would never be reachable from the dashboard.
        continue;
      }

      const onAgentDefinition = this.agentMcpDefinitionService
        .filterIdsForProvision([mcpId], McpConnectionScopeEnum.Subscriber)
        .includes(mcpId);

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
          ...(onAgentDefinition
            ? {
                externalProjection: {
                  providerId: command.providerId,
                  mcpServerName: catalog.name,
                  syncedAt,
                },
              }
            : {}),
        },
        writeOptions
      );
    }
  }
}
