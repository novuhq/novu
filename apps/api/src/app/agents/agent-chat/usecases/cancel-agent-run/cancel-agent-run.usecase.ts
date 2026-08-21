import { Injectable, NotFoundException } from '@nestjs/common';
import { AGENT_EVENT_PROTOCOL_VERSION, type AgentEventEnvelope } from '@novu/agent-event-protocol';
import { PinoLogger, shortId } from '@novu/application-generic';
import {
  type AgentEntity,
  AgentRepository,
  type ConversationEntity,
  ConversationParticipantTypeEnum,
  ConversationRepository,
} from '@novu/dal';
import { AgentConfigResolver, type ResolvedAgentConfig } from '../../../channels/agent-config-resolver.service';
import { AgentConversationService } from '../../../conversation-runtime/conversation/agent-conversation.service';
import { resolveLifecycleChannel } from '../../../conversation-runtime/conversation/run-lifecycle-activity';
import { AgentRunRegistryService } from '../../../conversation-runtime/runtime/agent-run-registry.service';
import { AgentEventContext, AgentEventSink } from '../../../shared/agent-event-sink.service';
import { AgentPlatformEnum } from '../../../shared/enums/agent-platform.enum';
import { withAgentChatContextFilter } from '../../agent-chat-context-query.util';
import { AgentChatPublicationService } from '../../agent-chat-publication.service';
import type { CancelAgentRunResponseDto } from '../../dtos/cancel-agent-run.dto';
import { CancelAgentRunCommand } from './cancel-agent-run.command';

function cancelCommandIdentifier(idempotencyKey: string): string {
  return `cancel_cmd_${idempotencyKey}`;
}

type ResolvedActiveRun = {
  runId?: string;
  inFlight: boolean;
};

@Injectable()
export class CancelAgentRun {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly agentRepository: AgentRepository,
    private readonly publicationService: AgentChatPublicationService,
    private readonly agentConfigResolver: AgentConfigResolver,
    private readonly conversationService: AgentConversationService,
    private readonly agentRunRegistry: AgentRunRegistryService,
    private readonly agentEventSink: AgentEventSink,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: CancelAgentRunCommand): Promise<CancelAgentRunResponseDto> {
    const conversation = await this.conversationRepository.findOne(
      withAgentChatContextFilter(
        this.conversationRepository,
        {
          identifier: command.conversationIdentifier,
          _environmentId: command.environmentId,
          _organizationId: command.organizationId,
        },
        command.contextKeys
      ),
      '*'
    );

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const isParticipant = conversation.participants.some(
      (participant) =>
        participant.type === ConversationParticipantTypeEnum.SUBSCRIBER && participant.id === command.subscriberId
    );

    if (!isParticipant) {
      throw new NotFoundException('Conversation not found');
    }

    const isAgentChatConversation = conversation.channels.some(
      (channel) => channel.platform === AgentPlatformEnum.AGENT_CHAT
    );

    if (!isAgentChatConversation) {
      throw new NotFoundException('Conversation not found');
    }

    const published = await this.publicationService.resolvePublishedAgent(
      command.agentIdentifier,
      command.environmentId,
      command.organizationId,
      command.agentHash
    );

    if (conversation._agentId !== published.agentId) {
      throw new NotFoundException('Conversation not found');
    }

    const agent = await this.agentRepository.findOne(
      { _id: published.agentId, _environmentId: command.environmentId },
      ['runtime', 'managedRuntime']
    );

    if (!agent) {
      throw new NotFoundException('Conversation not found');
    }

    const config = await this.agentConfigResolver.resolve(published.agentId, published.integrationIdentifier);
    const idempotencyKey = command.idempotencyKey || `cancel_${shortId(16)}`;
    const result = await this.cancelActiveRun({
      conversation,
      config,
      agent,
      idempotencyKey,
    });

    return {
      status: result.status,
      ...(result.runId ? { runId: result.runId } : {}),
    };
  }

  private async resolveActiveRun(params: {
    environmentId: string;
    organizationId: string;
    conversationId: string;
  }): Promise<ResolvedActiveRun | null> {
    const ledgerRun = await this.conversationService.findOpenRun(params);
    if (ledgerRun) {
      return { runId: ledgerRun.runId, inFlight: true };
    }

    const registryRunId = this.agentRunRegistry.getRunId(params.conversationId);
    if (registryRunId) {
      return { runId: registryRunId, inFlight: true };
    }

    if (this.agentRunRegistry.hasActiveRun(params.conversationId)) {
      return { inFlight: true };
    }

    return null;
  }

  private async cancelActiveRun(params: {
    conversation: ConversationEntity;
    config: ResolvedAgentConfig;
    agent: Pick<AgentEntity, 'runtime' | 'managedRuntime'>;
    idempotencyKey: string;
  }): Promise<CancelAgentRunResponseDto> {
    const conversationId = String(params.conversation._id);
    const activeRun = await this.resolveActiveRun({
      environmentId: params.config.environmentId,
      organizationId: params.config.organizationId,
      conversationId,
    });

    if (!activeRun) {
      return { status: 'no-op' };
    }

    const channel = this.conversationService.getPrimaryChannel(params.conversation);
    const idempotencyIdentifier = cancelCommandIdentifier(params.idempotencyKey);
    const recorded = await this.conversationService.recordCancelIdempotency({
      identifier: idempotencyIdentifier,
      conversationId,
      platform: channel.platform,
      integrationId: channel._integrationId,
      platformThreadId: channel.platformThreadId,
      agentId: params.config.agentIdentifier,
      environmentId: params.config.environmentId,
      organizationId: params.config.organizationId,
      runId: activeRun.runId ?? 'pending',
      idempotencyKey: params.idempotencyKey,
    });

    if (!recorded) {
      return { status: 'duplicate', ...(activeRun.runId ? { runId: activeRun.runId } : {}) };
    }

    const rollbackIdempotency = async () => {
      await this.conversationService.deleteCancelIdempotency({
        identifier: idempotencyIdentifier,
        environmentId: params.config.environmentId,
        organizationId: params.config.organizationId,
      });
    };

    const stillActive = await this.resolveActiveRun({
      environmentId: params.config.environmentId,
      organizationId: params.config.organizationId,
      conversationId,
    });

    if (!stillActive) {
      await rollbackIdempotency();

      return { status: 'no-op' };
    }

    const runId = stillActive.runId ?? activeRun.runId;
    this.agentRunRegistry.abort(conversationId);

    if (!runId) {
      return { status: 'canceled' };
    }

    const lifecycleChannel = resolveLifecycleChannel(params.conversation, channel.platformThreadId);
    const context: AgentEventContext = {
      userId: params.config.organizationId,
      environmentId: params.config.environmentId,
      organizationId: params.config.organizationId,
      conversationId,
      agentIdentifier: params.config.agentIdentifier,
      integrationIdentifier: params.config.integrationIdentifier,
      agentId: String(params.conversation._agentId),
      platform: AgentPlatformEnum.AGENT_CHAT,
      platformThreadId: lifecycleChannel.platformThreadId,
      channel: lifecycleChannel,
      sessionId: params.conversation.externalSessionId ?? undefined,
      source: params.agent.runtime === 'managed' && params.agent.managedRuntime ? 'managed' : 'bridge',
    };

    const envelope: AgentEventEnvelope = {
      version: AGENT_EVENT_PROTOCOL_VERSION,
      conversationId,
      agentId: params.config.agentIdentifier,
      runId,
      turnId: runId,
      sequence: Number.MAX_SAFE_INTEGER,
      timestamp: new Date().toISOString(),
      event: { type: 'run-finish', outcome: 'aborted' },
    };

    try {
      await this.agentEventSink.ingest(envelope, context);
    } catch (err) {
      await rollbackIdempotency();
      this.logger.error(err, `Failed to ingest aborted run-finish: run=${runId}`);
      throw err;
    }

    return { status: 'canceled', runId };
  }
}
