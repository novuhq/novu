import { forwardRef, Inject, Injectable } from '@nestjs/common';
import type { AgentEvent, AgentEventEnvelope } from '@novu/agent-event-protocol';
import { PinoLogger, WebSocketsQueueService } from '@novu/application-generic';
import {
  ConversationActivityEntity,
  ConversationEntity,
  ConversationParticipantTypeEnum,
  ConversationRepository,
  SubscriberRepository,
} from '@novu/dal';
import { WebSocketEventEnum } from '@novu/shared';
import { AgentConversationService } from '../conversation-runtime/conversation/agent-conversation.service';
import { usesProtocolEventApprovals } from '../shared/enums/agent-platform.enum';
import { buildLiveEnvelopeFromActivity } from './activity-to-events';
import { WebChatEventFactory } from './web-chat-event.factory';

export type WebChatLiveActivityEmitParams = {
  agentId: string;
  agentIdentifier: string;
  environmentId: string;
  organizationId: string;
  conversation: ConversationEntity;
  activity: ConversationActivityEntity;
};

export type PersistedClientEventEmitParams = {
  channel: { platform: string };
  conversationId: string;
  environmentId: string;
  organizationId: string;
  agentIdentifier: string;
  activity: ConversationActivityEntity;
};

export type WebChatWsEmitContext = {
  agentId: string;
  environmentId: string;
  organizationId: string;
  conversation: ConversationEntity;
};

export type WebChatEphemeralEmitParams = {
  agentIdentifier: string;
  environmentId: string;
  organizationId: string;
  conversation: ConversationEntity;
  event: AgentEvent;
  runId?: string;
  turnId?: string;
};

/**
 * Emits durable web-chat activities on live WS from the persist seam only.
 * Keeps tool + run-lifecycle ordering aligned with GET history.
 */
@Injectable()
export class WebChatLiveActivityPublisher {
  constructor(
    private readonly subscriberRepository: SubscriberRepository,
    private readonly conversationRepository: ConversationRepository,
    @Inject(forwardRef(() => AgentConversationService))
    private readonly conversationService: AgentConversationService,
    private readonly eventFactory: WebChatEventFactory,
    private readonly webSocketsQueueService: WebSocketsQueueService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async emit(params: WebChatLiveActivityEmitParams): Promise<void> {
    const envelope = buildLiveEnvelopeFromActivity(params.activity, {
      conversationId: params.conversation._id,
      conversationIdentifier: params.conversation.identifier,
      agentIdentifier: params.agentIdentifier,
    });
    if (!envelope) {
      return;
    }

    await this.emitBestEffort(
      {
        agentId: params.agentId,
        environmentId: params.environmentId,
        organizationId: params.organizationId,
        conversation: params.conversation,
      },
      envelope
    );
  }

  /**
   * Live WS fanout for ephemeral protocol events (e.g. provider-event).
   * Mints a conversation-global sequence and stamps the public agent identifier.
   */
  async emitEphemeralEvent(params: WebChatEphemeralEmitParams): Promise<void> {
    const sequence = await this.conversationService.mintEventSequence({
      environmentId: params.environmentId,
      organizationId: params.organizationId,
      conversationId: params.conversation._id,
    });

    const envelope = this.eventFactory.createEphemeralEnvelope({
      conversationId: params.conversation._id,
      conversationIdentifier: params.conversation.identifier,
      agentId: params.agentIdentifier,
      sequence,
      event: params.event,
      runId: params.runId,
      turnId: params.turnId,
    });

    await this.emitBestEffort(
      {
        agentId: params.conversation._agentId,
        environmentId: params.environmentId,
        organizationId: params.organizationId,
        conversation: params.conversation,
      },
      envelope
    );
  }

  /** Gate + conversation lookup for rows persisted outside the web-chat module. */
  async emitPersistedClientEvent(params: PersistedClientEventEmitParams): Promise<void> {
    if (!usesProtocolEventApprovals(params.channel.platform)) {
      return;
    }

    const conversation = await this.conversationRepository.findOne(
      {
        _id: params.conversationId,
        _environmentId: params.environmentId,
        _organizationId: params.organizationId,
      },
      '*'
    );

    if (!conversation) {
      return;
    }

    await this.emit({
      agentId: conversation._agentId,
      agentIdentifier: params.agentIdentifier,
      environmentId: params.environmentId,
      organizationId: params.organizationId,
      conversation,
      activity: params.activity,
    });
  }

  private async emitBestEffort(context: WebChatWsEmitContext, envelope: AgentEventEnvelope): Promise<void> {
    try {
      const subscriberExternalId = context.conversation.participants.find(
        (participant) => participant.type === ConversationParticipantTypeEnum.SUBSCRIBER
      )?.id;

      if (!subscriberExternalId) {
        this.logger.warn(
          { conversationId: context.conversation._id, agentId: context.agentId },
          'web chat live emit skipped: no subscriber participant'
        );

        return;
      }

      const subscriber = await this.subscriberRepository.findBySubscriberId(
        context.environmentId,
        subscriberExternalId
      );

      if (!subscriber) {
        this.logger.warn(
          { subscriberExternalId, environmentId: context.environmentId },
          'web chat live emit skipped: subscriber entity not found'
        );

        return;
      }

      await this.webSocketsQueueService.add({
        name: 'sendMessage',
        data: {
          event: WebSocketEventEnum.AGENT_EVENT,
          userId: subscriber._id,
          _environmentId: context.environmentId,
          _organizationId: context.organizationId,
          subscriberId: subscriber.subscriberId,
          payload: envelope as unknown as Record<string, unknown>,
          contextKeys: context.conversation.contextKeys ?? [],
        },
        groupId: context.organizationId,
      });
    } catch (err) {
      this.logger.warn(
        { err, conversationId: context.conversation._id, sequence: envelope.sequence },
        'web chat live WS enqueue failed'
      );
    }
  }
}
