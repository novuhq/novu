import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  CreateOrUpdateSubscriberCommand,
  CreateOrUpdateSubscriberUseCase,
  FeatureFlagsService,
  PinoLogger,
  resolveAgentRuntime,
} from '@novu/application-generic';
import {
  AgentMcpServerRepository,
  AgentRepository,
  EnvironmentRepository,
  IntegrationRepository,
  McpConnectionRepository,
  SubscriberRepository,
} from '@novu/dal';
import {
  AgentRuntimeProviderIdEnum,
  buildClaudePlatformVaultUrl,
  buildConnectSubscriberId,
  isClaudePlatformConsoleProvider,
  MCP_SERVERS,
  McpConnectionAuthModeEnum,
  McpConnectionScopeEnum,
  McpConnectionStatusEnum,
} from '@novu/shared';

import { EnableAgentMcpServerCommand } from '../../enablement/enable-agent-mcp-server/enable-agent-mcp-server.command';
import { EnableAgentMcpServer } from '../../enablement/enable-agent-mcp-server/enable-agent-mcp-server.usecase';
import { assertMcpProviderManagedFlagEnabled } from '../../shared/assert-mcp-provider-managed-flag-enabled';
import { McpConnectionVaultService } from '../mcp-connection-vault.service';
import { EnsureProviderManagedVaultCommand } from './ensure-provider-managed-vault.command';
import { buildProviderManagedRedirectUrl, signProviderManagedRedirectState } from './provider-managed-redirect-state';

export type EnsureProviderManagedVaultResult = {
  /** Deep link the dashboard opens in a new tab so the user can finish connector OAuth in Claude. */
  vaultUrl: string;
  /** Anthropic vault container id Novu provisioned for this subscriber + agent. */
  externalVaultId: string;
};

/**
 * Ensure a `provider-managed` MCP is fully provisioned for the current
 * dashboard user and return the deep link to the provider's vault UI so the
 * user can finish the connector OAuth there.
 *
 * Pure delegation flow — Novu never speaks OAuth for these MCPs:
 *
 *   1. Gate the flow per-org (`IS_MCP_PROVIDER_MANAGED_ENABLED`) before any
 *      subscriber provisioning or enablement writes. `EnableAgentMcpServer`
 *      re-asserts the same flag as defense in depth.
 *   2. Map the dashboard `userId` to a Novu subscriber in the current
 *      environment so the vault is keyed by the same `Subscriber._id` the
 *      runtime providers use for `vault_ids` at dispatch.
 *   3. Resolve the managed agent runtime + integration credentials and bail
 *      cleanly when the provider is not Claude platform (NovuAnthropic /
 *      anything else doesn't expose a vault deep link, so the redirect would
 *      go nowhere).
 *   4. Idempotently enable the MCP on the agent (the existing
 *      `EnableAgentMcpServer` usecase already syncs the provider projection).
 *   5. Reuse the subscriber's existing vault when a sibling MCP row already
 *      owns one; otherwise create a fresh `vlt_…` container via the runtime
 *      provider and race-safely claim it on Mongo.
 *   6. Upsert a `provider-managed` `mcp_connection` row with `status:
 *      connected` so the dashboard "Added from Claude" badge can light up
 *      immediately. The credential itself lives entirely inside Claude — no
 *      access/refresh tokens are persisted on the Novu side.
 *   7. Return the deep-link the dashboard opens in a new tab.
 */
@Injectable()
export class EnsureProviderManagedVault {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly agentMcpServerRepository: AgentMcpServerRepository,
    private readonly mcpConnectionRepository: McpConnectionRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly subscriberRepository: SubscriberRepository,
    private readonly environmentRepository: EnvironmentRepository,
    private readonly createOrUpdateSubscriber: CreateOrUpdateSubscriberUseCase,
    private readonly enableAgentMcpServer: EnableAgentMcpServer,
    private readonly mcpConnectionVaultService: McpConnectionVaultService,
    private readonly featureFlagsService: FeatureFlagsService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(EnsureProviderManagedVault.name);
  }

  /**
   * Provision (or reuse) the provider-managed vault for the channel subscriber
   * triggering a managed-agent setup card and return the deep link the in-thread
   * "Connect from provider" button opens. Mirrors `execute` but resolves the
   * subscriber from the inbound `subscriberId` instead of mapping a dashboard
   * `userId` to `connect:<userId>`.
   */
  async executeForSetupCard(command: EnsureProviderManagedVaultCommand): Promise<EnsureProviderManagedVaultResult> {
    if (!command.subscriberId) {
      throw new BadRequestException('subscriberId is required for the setup-card vault flow.');
    }

    // Setup-card flow only provisions the vault container; it must NOT promote
    // the connection to `connected` here. Promotion happens when the user
    // clicks the in-channel link, which is intercepted by the Novu redirect
    // endpoint (the click is the user-intent signal — provider-managed MCPs
    // have no Novu OAuth callback that could confirm OAuth completion).
    const internal = await this.executeInternal(command, { markConnectedOnProvision: false });

    const apiKey = await this.getEnvironmentApiKey(command.environmentId);
    const signedState = signProviderManagedRedirectState(
      {
        connectionId: internal.connection._id,
        agentId: internal.agentId,
        agentMcpServerId: internal.agentMcpServerId,
        subscriberId: internal.subscriberMongoId,
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        mcpId: command.mcpId,
        externalVaultId: internal.externalVaultId,
        ...(internal.externalWorkspaceId ? { externalWorkspaceId: internal.externalWorkspaceId } : {}),
        ...(command.conversationId ? { conversationId: command.conversationId } : {}),
        timestamp: Date.now(),
      },
      apiKey
    );

    return {
      vaultUrl: buildProviderManagedRedirectUrl(signedState),
      externalVaultId: internal.externalVaultId,
    };
  }

  async execute(command: EnsureProviderManagedVaultCommand): Promise<EnsureProviderManagedVaultResult> {
    // Dashboard "Add from Claude" flow: the user explicitly clicked the
    // button, so we treat the click as intent and promote the connection
    // to `connected` so the "Added from Claude" badge can light up.
    const internal = await this.executeInternal(command, { markConnectedOnProvision: true });

    return {
      vaultUrl: buildClaudePlatformVaultUrl(internal.externalVaultId, internal.externalWorkspaceId),
      externalVaultId: internal.externalVaultId,
    };
  }

  private async getEnvironmentApiKey(environmentId: string): Promise<string> {
    const environment = await this.environmentRepository.findOne({ _id: environmentId }, ['apiKeys']);

    if (!environment?.apiKeys?.length) {
      throw new UnprocessableEntityException(
        'Environment has no API keys; cannot sign provider-managed redirect state.'
      );
    }

    return environment.apiKeys[0].key;
  }

  private async executeInternal(
    command: EnsureProviderManagedVaultCommand,
    options: { markConnectedOnProvision: boolean }
  ): Promise<{
    externalVaultId: string;
    externalWorkspaceId?: string;
    connection: { _id: string; _subscriberId?: string };
    agentId: string;
    agentMcpServerId: string;
    subscriberMongoId: string;
  }> {
    const catalog = MCP_SERVERS.find((entry) => entry.id === command.mcpId);

    if (!catalog) {
      throw new BadRequestException(`Unknown MCP "${command.mcpId}".`);
    }

    if (catalog.oauth?.mode !== McpConnectionAuthModeEnum.ProviderManaged) {
      throw new BadRequestException(
        `MCP "${command.mcpId}" is not provider-managed; use the standard OAuth endpoints instead.`
      );
    }

    await assertMcpProviderManagedFlagEnabled({
      featureFlagsService: this.featureFlagsService,
      mcpId: command.mcpId,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
    });

    const agent = await this.agentRepository.findOne(
      {
        identifier: command.agentIdentifier,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      ['_id', 'runtime', 'managedRuntime']
    );

    if (!agent) {
      throw new NotFoundException(`Agent "${command.agentIdentifier}" not found.`);
    }

    if (agent.runtime !== 'managed' || !agent.managedRuntime) {
      throw new UnprocessableEntityException(
        `MCP "${command.mcpId}" requires a managed-runtime agent to delegate OAuth to the runtime provider.`
      );
    }

    // Only Claude platform agents (Anthropic / AnthropicAws) expose a vault
    // deep link the user can complete OAuth inside. The Novu-managed demo
    // does not surface a console URL — see `buildAgentConsoleUrl` — so it
    // would have nowhere to redirect to.
    if (
      !isClaudePlatformConsoleProvider(agent.managedRuntime.providerId) ||
      agent.managedRuntime.providerId === AgentRuntimeProviderIdEnum.NovuAnthropic
    ) {
      throw new UnprocessableEntityException(
        `Provider-managed MCPs are only supported on Claude platform agents today.`
      );
    }

    const integration = await this.integrationRepository.findOne({
      _id: agent.managedRuntime._integrationId,
      _environmentId: command.environmentId,
    });

    if (!integration?.credentials) {
      throw new UnprocessableEntityException(`Agent "${command.agentIdentifier}" has no resolvable integration.`);
    }

    const resolved = resolveAgentRuntime(agent.managedRuntime.providerId, integration.credentials);

    if (!resolved) {
      throw new UnprocessableEntityException(
        `Could not resolve runtime credentials for agent "${command.agentIdentifier}".`
      );
    }

    if (!resolved.provider.capabilities.tokenVault) {
      throw new UnprocessableEntityException(
        `Runtime provider "${agent.managedRuntime.providerId}" does not expose a vault for provider-managed MCPs.`
      );
    }

    const externalWorkspaceId =
      typeof resolved.credentials.externalWorkspaceId === 'string'
        ? resolved.credentials.externalWorkspaceId
        : undefined;

    const subscriber = await this.resolveSubscriber(command);

    // EnableAgentMcpServer handles the catalog -> enablement row mapping,
    // re-enables a stale `enabled: false` row, runs the provider projection,
    // and re-asserts the provider-managed feature flag. We rely on its
    // idempotent ConflictException-on-already-enabled semantics by catching
    // and re-reading the existing row — running the dedicated endpoint a
    // second time should NOT error.
    const enablement = await this.ensureEnablementRow(command);

    const agentMcpServerIds = (
      await this.agentMcpServerRepository.findByAgent({
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        agentId: agent._id,
      })
    ).map((row) => row._id);

    const subscriberVaultId = await this.mcpConnectionRepository.findSubscriberExternalVaultId({
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      subscriberId: subscriber._id,
      agentMcpServerIds,
    });

    const existingConnection = await this.mcpConnectionRepository.findSubscriberConnection({
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      agentMcpServerId: enablement._id,
      subscriberId: subscriber._id,
    });

    let externalVaultId: string;
    let provisionedConnection: { _id: string; _subscriberId?: string } | null = null;

    if (existingConnection?.auth?.externalVaultId) {
      externalVaultId = existingConnection.auth.externalVaultId;
      provisionedConnection = existingConnection;
    } else {
      const connection = await this.createOrFetchProviderManagedConnection({
        command,
        agentMcpServerId: enablement._id,
        subscriberMongoId: subscriber._id,
      });

      if (connection.auth?.externalVaultId) {
        externalVaultId = connection.auth.externalVaultId;
      } else if (subscriberVaultId) {
        await this.mcpConnectionRepository.setConnectionExternalVaultIdIfMissing({
          connectionId: connection._id,
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          externalVaultId: subscriberVaultId,
        });
        externalVaultId = subscriberVaultId;
      } else {
        externalVaultId = await this.mcpConnectionVaultService.ensureConnectionVault({
          connection,
          agentId: agent._id,
          runtimeProvider: resolved.provider,
        });
      }

      provisionedConnection = connection;
    }

    if (options.markConnectedOnProvision && provisionedConnection) {
      await this.markProviderManagedConnectionConnected(provisionedConnection, command);
    }

    if (!provisionedConnection) {
      throw new UnprocessableEntityException('Provider-managed vault provisioning produced no connection row.');
    }

    return {
      externalVaultId,
      ...(externalWorkspaceId ? { externalWorkspaceId } : {}),
      connection: provisionedConnection,
      agentId: agent._id,
      agentMcpServerId: enablement._id,
      subscriberMongoId: subscriber._id,
    };
  }

  /**
   * Map the calling identity to a Novu subscriber.
   *
   * - When `command.subscriberId` is set (managed-agent setup-card flow), use
   *   the channel subscriber directly. The vault must belong to the person
   *   triggering the agent in Slack/Teams, not the dashboard admin.
   * - Otherwise (dashboard "Add from Claude") map `userId` to a
   *   `connect:<userId>` subscriber, falling back to the legacy raw `userId`
   *   row before provisioning a fresh one.
   */
  private async resolveSubscriber(
    command: EnsureProviderManagedVaultCommand
  ): Promise<{ _id: string; subscriberId: string }> {
    if (command.subscriberId) {
      const channelSubscriber = await this.subscriberRepository.findBySubscriberId(
        command.environmentId,
        command.subscriberId
      );

      if (!channelSubscriber) {
        throw new NotFoundException(`Subscriber "${command.subscriberId}" not found in this environment.`);
      }

      return channelSubscriber;
    }

    const connectSubscriberId = buildConnectSubscriberId(command.userId);
    const connectSubscriber = await this.subscriberRepository.findBySubscriberId(
      command.environmentId,
      connectSubscriberId
    );

    if (connectSubscriber) {
      return connectSubscriber;
    }

    const legacySubscriber = await this.subscriberRepository.findBySubscriberId(command.environmentId, command.userId);

    if (legacySubscriber) {
      return legacySubscriber;
    }

    const created = await this.createOrUpdateSubscriber.execute(
      CreateOrUpdateSubscriberCommand.create({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        subscriberId: connectSubscriberId,
        allowUpdate: false,
      })
    );

    if (!created) {
      throw new UnprocessableEntityException('Failed to provision Novu subscriber for the current user.');
    }

    return created;
  }

  /**
   * Enable the catalog MCP on the agent and read back the enablement row.
   * Treat a `ConflictException` (already enabled) as success — the row
   * still exists with the correct `defaultAuthMode`, and we want this
   * usecase to be idempotent for retries / reloads from the dashboard.
   */
  private async ensureEnablementRow(command: EnsureProviderManagedVaultCommand) {
    try {
      await this.enableAgentMcpServer.execute(
        EnableAgentMcpServerCommand.create({
          userId: command.userId,
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          agentIdentifier: command.agentIdentifier,
          mcpId: command.mcpId,
        })
      );
    } catch (err) {
      // ConflictException is the documented "already enabled and healthy"
      // signal. Anything else (catalog mismatch, flag off, sync failure)
      // bubbles up to the caller untouched.
      if (!(err instanceof ConflictException)) {
        throw err;
      }
    }

    const agent = await this.agentRepository.findOne(
      {
        identifier: command.agentIdentifier,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      ['_id']
    );

    if (!agent) {
      throw new NotFoundException(`Agent "${command.agentIdentifier}" not found.`);
    }

    const enablement = await this.agentMcpServerRepository.findByAgentAndMcpId({
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      agentId: agent._id,
      mcpId: command.mcpId,
    });

    if (!enablement) {
      throw new UnprocessableEntityException(`Enablement row was not created for MCP "${command.mcpId}".`);
    }

    return enablement;
  }

  /**
   * Promote the subscriber's provider-managed row to `connected` once the
   * vault id is known. Idempotent — safe on every "Add from Claude" retry.
   */
  private async markProviderManagedConnectionConnected(
    connection: { _id: string; _subscriberId?: string },
    command: EnsureProviderManagedVaultCommand
  ): Promise<void> {
    await this.mcpConnectionRepository.update(
      {
        _id: connection._id,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      {
        $set: {
          status: McpConnectionStatusEnum.Connected,
          connectedAt: new Date(),
        },
        $unset: { oauthState: 1, lastError: 1 },
      }
    );
  }

  /**
   * Create the placeholder `mcp_connection` row that anchors the
   * subscriber's vault. We start in `pending_oauth` so the vault service's
   * existing race-safe sibling-reuse logic stays untouched; the row is
   * promoted to `connected` once `ensureConnectionVault` returns.
   *
   * If a row already exists (e.g. concurrent click) we re-read it so the
   * caller can drive `ensureConnectionVault` against the winner.
   */
  private async createOrFetchProviderManagedConnection(args: {
    command: EnsureProviderManagedVaultCommand;
    agentMcpServerId: string;
    subscriberMongoId: string;
  }) {
    const { command, agentMcpServerId, subscriberMongoId } = args;

    const existing = await this.mcpConnectionRepository.findSubscriberConnection({
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      agentMcpServerId,
      subscriberId: subscriberMongoId,
    });

    if (existing) {
      return existing;
    }

    try {
      return await this.mcpConnectionRepository.create({
        _organizationId: command.organizationId,
        _environmentId: command.environmentId,
        scope: McpConnectionScopeEnum.Subscriber,
        mcpId: command.mcpId,
        _agentMcpServerId: agentMcpServerId,
        _subscriberId: subscriberMongoId,
        authMode: McpConnectionAuthModeEnum.ProviderManaged,
        status: McpConnectionStatusEnum.PendingOAuth,
      });
    } catch (err) {
      // Concurrent caller won the unique index race; re-read so we drive
      // `ensureConnectionVault` against the same row the winner now owns.
      const winner = await this.mcpConnectionRepository.findSubscriberConnection({
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        agentMcpServerId,
        subscriberId: subscriberMongoId,
      });

      if (winner) {
        return winner;
      }

      throw err;
    }
  }
}
