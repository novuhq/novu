import { Injectable } from '@nestjs/common';
import type { AgentEventEnvelope } from '@novu/agent-event-protocol';
import { PinoLogger, WebSocketsQueueService } from '@novu/application-generic';
import {
  ConversationActivityEntity,
  ConversationEntity,
  ConversationParticipantTypeEnum,
  ConversationRepository,
  SubscriberRepository,
} from '@novu/dal';
import { WebSocketEventEnum } from '@novu/shared';
import { usesProtocolEventApprovals } from '../shared/enums/agent-platform.enum';
import { buildLiveEnvelopeFromActivity } from './activity-to-events';

export type AgentChatLiveActivityEmitParams = {
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

export type AgentChatWsEmitContext = {
  agentId: string;
  environmentId: string;
  organizationId: string;
  conversation: ConversationEntity;
};

/**
 * Emits durable agent-chat activities on live WS from the persist seam only.
 * Keeps tool + run-lifecycle ordering aligned with GET history.
 */
@Injectable()
export class AgentChatLiveActivityPublisher {
  constructor(
    private readonly subscriberRepository: SubscriberRepository,
    private readonly conversationRepository: ConversationRepository,
    private readonly webSocketsQueueService: WebSocketsQueueService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async emit(params: AgentChatLiveActivityEmitParams): Promise<void> {
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

  /** Live WS fanout for a pre-built envelope (e.g. provider-event from ingest). */
  async emitPrebuiltEnvelope(context: AgentChatWsEmitContext, envelope: AgentEventEnvelope): Promise<void> {
    const stamped =
      envelope.conversationIdentifier !== undefined
        ? envelope
        : { ...envelope, conversationIdentifier: context.conversation.identifier };

    await this.emitBestEffort(context, stamped);
  }

  /** Gate + conversation lookup for rows persisted outside the agent-chat module. */
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

  private async emitBestEffort(context: AgentChatWsEmitContext, envelope: AgentEventEnvelope): Promise<void> {
    try {
      const subscriberExternalId = context.conversation.participants.find(
        (participant) => participant.type === ConversationParticipantTypeEnum.SUBSCRIBER
      )?.id;

      if (!subscriberExternalId) {
        this.logger.warn(
          { conversationId: context.conversation._id, agentId: context.agentId },
          'agent chat live emit skipped: no subscriber participant'
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
          'agent chat live emit skipped: subscriber entity not found'
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
        'agent chat live WS enqueue failed'
      );
    }
  }
}
