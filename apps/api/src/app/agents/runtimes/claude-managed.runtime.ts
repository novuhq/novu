import Anthropic from '@anthropic-ai/sdk';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ClaudeManagedAgentQueueService, PinoLogger } from '@novu/application-generic';
import { ConversationRepository } from '@novu/dal';
import { AgentEventEnum } from '../dtos/agent-event.enum';
import { PLATFORMS_WITH_INTERIM_EDITS } from '../dtos/agent-platform.enum';
import { AnthropicAgentCredentialsService } from '../services/anthropic-agent-credentials.service';
import type { AgentRuntime, AgentRuntimeExecuteParams } from './agent-runtime.interface';

const CLAUDE_MANAGED_AGENT_JOB_NAME = 'process-claude-managed-session';

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
    private readonly logger: PinoLogger
  ) {}

  async execute(params: AgentRuntimeExecuteParams): Promise<void> {
    const { config, conversation, event } = params;

    if (!config.managedRuntime) {
      throw new BadRequestException(`Claude managed runtime is not configured for agent ${config.agentIdentifier}.`);
    }

    if (event === AgentEventEnum.ON_RESOLVE) {
      await this.archiveSession(params);

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
    const sessionId = await this.resolveSessionId(client, params);

    await client.beta.sessions.events.send(sessionId, {
      events: [
        {
          type: 'user.message',
          content: [{ type: 'text', text }],
        },
      ],
    });

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
      },
      groupId: config.organizationId,
      options: {
        // A session must have exactly one active stream reader. While a job is active,
        // additional user events are picked up by that same stream instead of spawning
        // competing workers against the same Anthropic session.
        jobId: sessionId,
      },
    });
  }

  private async resolveSessionId(client: Anthropic, params: AgentRuntimeExecuteParams): Promise<string> {
    const existingSessionId = params.conversation.externalSessionId;
    if (existingSessionId) {
      return existingSessionId;
    }

    const { config, conversation } = params;
    if (!config.managedRuntime) {
      throw new BadRequestException(`Claude managed runtime is not configured for agent ${config.agentIdentifier}.`);
    }

    const session = await client.beta.sessions.create({
      agent: { type: 'agent', id: config.managedRuntime.agentId },
      environment_id: config.managedRuntime.environmentId,
      vault_ids: config.managedRuntime.vaultIds,
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
