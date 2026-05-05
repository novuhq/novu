import Anthropic from '@anthropic-ai/sdk';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ClaudeManagedAgentQueueService, PinoLogger } from '@novu/application-generic';
import { ConversationParticipantTypeEnum, ConversationRepository } from '@novu/dal';
import { AgentEventEnum } from '../dtos/agent-event.enum';
import { PLATFORMS_WITH_INTERIM_EDITS } from '../dtos/agent-platform.enum';
import { AnthropicAgentCredentialsService } from '../services/anthropic-agent-credentials.service';
import { OrgAnthropicVaultService } from '../services/org-anthropic-vault.service';
import { SubscriberAnthropicVaultService } from '../services/subscriber-anthropic-vault.service';
import type { AgentRuntime, AgentRuntimeExecuteParams } from './agent-runtime.interface';

const CLAUDE_MANAGED_AGENT_JOB_NAME = 'process-claude-managed-session';

/**
 * Action ids on approval cards posted by the worker. Must match the constants in
 * `apps/worker/.../claude-managed-agent.worker.service.ts`.
 */
const MCP_APPROVE_ACTION_ID = 'mcp:allow';
const MCP_DENY_ACTION_ID = 'mcp:deny';

export class MissingClaudeManagedCredentialsError extends Error {
  constructor(agentIdentifier: string) {
    super(`Anthropic API key is not configured for Claude managed agent ${agentIdentifier}`);
    this.name = 'MissingClaudeManagedCredentialsError';
  }
}

@Injectable()
export class ClaudeManagedRuntime implements AgentRuntime {
  constructor(
    private readonly credentialsService: AnthropicAgentCredentialsService,
    private readonly conversationRepository: ConversationRepository,
    private readonly claudeManagedAgentQueueService: ClaudeManagedAgentQueueService,
    private readonly orgVaultService: OrgAnthropicVaultService,
    private readonly subscriberVaultService: SubscriberAnthropicVaultService,
    private readonly logger: PinoLogger
  ) {}

  async execute(params: AgentRuntimeExecuteParams): Promise<void> {
    const { config, event } = params;

    if (!config.managedRuntime) {
      throw new BadRequestException(`Claude managed runtime is not configured for agent ${config.agentIdentifier}.`);
    }

    if (event === AgentEventEnum.ON_RESOLVE) {
      await this.archiveSession(params);

      return;
    }

    if (event === AgentEventEnum.ON_ACTION) {
      await this.handleAction(params);

      return;
    }

    if (event !== AgentEventEnum.ON_MESSAGE) {
      this.logger.debug(`[agent:${config.agentIdentifier}] Skipping unsupported Claude managed event ${event}`);

      return;
    }

    const text = params.message?.text?.trim();
    if (!text) {
      this.logger.debug(`[agent:${config.agentIdentifier}] Skipping empty Claude managed message`);

      return;
    }

    const apiKey = await this.getApiKeyOrThrow(config.organizationId, config.environmentId, config.agentIdentifier);
    const client = new Anthropic({ apiKey });
    const sessionId = await this.resolveSessionId(client, params, apiKey);

    await client.beta.sessions.events.send(sessionId, {
      events: [
        {
          type: 'user.message',
          content: [{ type: 'text', text }],
        },
      ],
    });

    await this.enqueueStreamConsumer({ params, sessionId });
  }

  /**
   * The user clicked an Approve / Deny button on an MCP approval card the worker posted
   * earlier. Translate that into a `user.tool_confirmation` event on the same Anthropic
   * session, then re-enqueue the stream consumer so the agent can complete its turn.
   *
   * Cards from older messages or third-party flows are silently ignored — only events
   * whose `actionId` matches our `mcp:allow` / `mcp:deny` prefix are handled here.
   */
  private async handleAction(params: AgentRuntimeExecuteParams): Promise<void> {
    const { config, conversation, action } = params;
    if (!action) return;

    if (action.actionId !== MCP_APPROVE_ACTION_ID && action.actionId !== MCP_DENY_ACTION_ID) {
      this.logger.debug(
        `[agent:${config.agentIdentifier}] Ignoring unrelated action ${action.actionId} on Claude managed runtime`
      );

      return;
    }

    const sessionId = conversation.externalSessionId;
    if (!sessionId) {
      this.logger.warn(
        `[agent:${config.agentIdentifier}] Received MCP approval action ${action.actionId} for conversation ${conversation._id} with no active session — ignoring`
      );

      return;
    }

    const toolUseId = action.value;
    if (!toolUseId) {
      this.logger.warn(
        `[agent:${config.agentIdentifier}] MCP approval action ${action.actionId} arrived without a tool_use_id; ignoring`
      );

      return;
    }

    const apiKey = await this.getApiKeyOrThrow(config.organizationId, config.environmentId, config.agentIdentifier);
    const client = new Anthropic({ apiKey });

    const result = action.actionId === MCP_APPROVE_ACTION_ID ? 'allow' : 'deny';

    try {
      await client.beta.sessions.events.send(sessionId, {
        events: [
          {
            type: 'user.tool_confirmation',
            tool_use_id: toolUseId,
            result,
            ...(result === 'deny' ? { deny_message: 'User denied this tool call.' } : {}),
          },
        ],
      });
    } catch (err) {
      this.logger.error(
        err,
        `[agent:${config.agentIdentifier}] Failed to send tool_confirmation (${result}) for ${toolUseId} on session ${sessionId}`
      );
      throw err;
    }

    await this.enqueueStreamConsumer({ params, sessionId });
  }

  /**
   * Re-enqueues the worker job that drains the Anthropic session stream. The Bull `jobId`
   * is set to the session id so a single drain runs at a time per session — additional
   * user events (messages, tool_confirmations) are picked up by that same drain instead
   * of spawning competing workers against the same session.
   */
  private async enqueueStreamConsumer(args: { params: AgentRuntimeExecuteParams; sessionId: string }): Promise<void> {
    const { params, sessionId } = args;
    const { config, conversation } = params;

    const subscriberId = conversation.participants?.find(
      (participant) => participant.type === ConversationParticipantTypeEnum.SUBSCRIBER
    )?.id;

    await this.claudeManagedAgentQueueService.add({
      name: CLAUDE_MANAGED_AGENT_JOB_NAME,
      data: {
        sessionId,
        agentIdentifier: config.agentIdentifier,
        conversationId: conversation._id,
        environmentId: config.environmentId,
        organizationId: config.organizationId,
        integrationIdentifier: config.integrationIdentifier,
        platform: config.platform,
        interimEditsSupported: PLATFORMS_WITH_INTERIM_EDITS.has(config.platform),
        subscriberId,
      },
      groupId: config.organizationId,
      options: {
        jobId: sessionId,
      },
    });
  }

  private async resolveSessionId(
    client: Anthropic,
    params: AgentRuntimeExecuteParams,
    apiKey: string
  ): Promise<string> {
    const existingSessionId = params.conversation.externalSessionId;
    if (existingSessionId) {
      return existingSessionId;
    }

    const { config, conversation } = params;
    if (!config.managedRuntime) {
      throw new BadRequestException(`Claude managed runtime is not configured for agent ${config.agentIdentifier}.`);
    }

    const vaultIds = await this.collectVaultIds({ params, apiKey });

    const session = await client.beta.sessions.create({
      agent: { type: 'agent', id: config.managedRuntime.agentId },
      environment_id: config.managedRuntime.environmentId,
      vault_ids: vaultIds.length ? vaultIds : undefined,
    });

    const didPersistSession = await this.conversationRepository.setExternalSessionIdIfMissing(
      config.environmentId,
      config.organizationId,
      conversation._id,
      session.id
    );

    if (!didPersistSession) {
      const latestConversation = await this.conversationRepository.findById(
        {
          _id: conversation._id,
          _environmentId: config.environmentId,
          _organizationId: config.organizationId,
        },
        ['externalSessionId']
      );
      if (latestConversation?.externalSessionId) {
        await client.beta.sessions.archive(session.id).catch((err) => {
          this.logger.warn(err, `[agent:${config.agentIdentifier}] Failed to archive unused Claude managed session`);
        });
        conversation.externalSessionId = latestConversation.externalSessionId;

        return latestConversation.externalSessionId;
      }
    }

    conversation.externalSessionId = session.id;

    return session.id;
  }

  /**
   * Builds the vault_ids array Anthropic sees on session create. Combines (in order):
   *   1. Legacy explicit vault ids from the agent config (back-compat).
   *   2. The per-subscriber vault when the conversation has a SUBSCRIBER participant.
   *   3. The org-shared vault for static-bearer MCPs.
   *
   * Anthropic resolves the right credential per MCP server URL across all supplied
   * vaults, so passing both subscriber + org vaults is safe.
   */
  private async collectVaultIds(args: { params: AgentRuntimeExecuteParams; apiKey: string }): Promise<string[]> {
    const { params, apiKey } = args;
    const { config, conversation } = params;
    const ids = [...(config.managedRuntime?.vaultIds ?? [])];

    const subscriberId = conversation.participants?.find(
      (participant) => participant.type === ConversationParticipantTypeEnum.SUBSCRIBER
    )?.id;

    if (subscriberId) {
      try {
        const subscriberVault = await this.subscriberVaultService.ensureVault({
          organizationId: config.organizationId,
          environmentId: config.environmentId,
          subscriberId,
          agentId: config.agentId,
          apiKey,
        });
        ids.push(subscriberVault.anthropicVaultId);
      } catch (err) {
        // Don't block the session if vault provisioning fails — Claude will surface
        // any per-subscriber MCP failure as session.error and Phase 4 will recover.
        this.logger.warn(
          err,
          `[agent:${config.agentIdentifier}] Failed to ensure subscriber vault for ${subscriberId}; continuing without it`
        );
      }
    }

    const orgVaultId = await this.orgVaultService.tryGet(config.organizationId, config.environmentId);
    if (orgVaultId) {
      ids.push(orgVaultId);
    }

    return ids;
  }

  private async archiveSession(params: AgentRuntimeExecuteParams): Promise<void> {
    const sessionId = params.conversation.externalSessionId;
    if (!sessionId) {
      return;
    }

    const apiKey = await this.getApiKeyOrThrow(
      params.config.organizationId,
      params.config.environmentId,
      params.config.agentIdentifier
    );
    const client = new Anthropic({ apiKey });

    await client.beta.sessions.archive(sessionId);
    await this.conversationRepository.clearExternalSessionId(
      params.config.environmentId,
      params.config.organizationId,
      params.conversation._id
    );
    params.conversation.externalSessionId = undefined;
  }

  private async getApiKeyOrThrow(
    organizationId: string,
    environmentId: string,
    agentIdentifier: string
  ): Promise<string> {
    try {
      return await this.credentialsService.getApiKey(organizationId, environmentId);
    } catch (err) {
      if (err instanceof NotFoundException) {
        throw new MissingClaudeManagedCredentialsError(agentIdentifier);
      }

      throw err;
    }
  }
}
