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

    await this.emitBestEffort(params, envelope);
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

  private async emitBestEffort(params: AgentChatLiveActivityEmitParams, envelope: AgentEventEnvelope): Promise<void> {
    try {
      const subscriberExternalId = params.conversation.participants.find(
        (participant) => participant.type === ConversationParticipantTypeEnum.SUBSCRIBER
      )?.id;

      if (!subscriberExternalId) {
        this.logger.warn(
          { conversationId: params.conversation._id, agentId: params.agentId },
          'agent chat live emit skipped: no subscriber participant'
        );

        return;
      }

      const subscriber = await this.subscriberRepository.findBySubscriberId(params.environmentId, subscriberExternalId);

      if (!subscriber) {
        this.logger.warn(
          { subscriberExternalId, environmentId: params.environmentId },
          'agent chat live emit skipped: subscriber entity not found'
        );

        return;
      }

      await this.webSocketsQueueService.add({
        name: 'sendMessage',
        data: {
          event: WebSocketEventEnum.AGENT_EVENT,
          userId: subscriber._id,
          _environmentId: params.environmentId,
          _organizationId: params.organizationId,
          subscriberId: subscriber.subscriberId,
          payload: envelope as unknown as Record<string, unknown>,
          contextKeys: params.conversation.contextKeys ?? [],
        },
        groupId: params.organizationId,
      });
    } catch (err) {
      this.logger.warn(
        { err, conversationId: params.conversation._id, sequence: envelope.sequence },
        'agent chat live WS enqueue failed'
      );
    }
  }
}
