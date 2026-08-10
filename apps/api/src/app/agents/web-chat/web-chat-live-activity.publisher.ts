import { Injectable } from '@nestjs/common';
import type { AgentEventEnvelope } from '@novu/agent-event-protocol';
import { PinoLogger, WebSocketsQueueService } from '@novu/application-generic';
import {
  ConversationActivityEntity,
  ConversationEntity,
  ConversationParticipantTypeEnum,
  SubscriberRepository,
} from '@novu/dal';
import { WebSocketEventEnum } from '@novu/shared';
import { buildLiveEnvelopeFromActivity } from './activity-to-events';

export type WebChatLiveActivityEmitParams = {
  agentId: string;
  agentIdentifier: string;
  environmentId: string;
  organizationId: string;
  conversation: ConversationEntity;
  activity: ConversationActivityEntity;
};

/**
 * Emits durable web-chat activities on live WS from the persist seam only.
 * Keeps TOOL_APPROVAL_REQUEST/DECISION/RESULT ordering aligned with history.
 */
@Injectable()
export class WebChatLiveActivityPublisher {
  constructor(
    private readonly subscriberRepository: SubscriberRepository,
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

    await this.emitBestEffort(params, envelope);
  }

  private async emitBestEffort(params: WebChatLiveActivityEmitParams, envelope: AgentEventEnvelope): Promise<void> {
    try {
      const subscriberExternalId = params.conversation.participants.find(
        (participant) => participant.type === ConversationParticipantTypeEnum.SUBSCRIBER
      )?.id;

      if (!subscriberExternalId) {
        this.logger.warn(
          { conversationId: params.conversation._id, agentId: params.agentId },
          'web chat live emit skipped: no subscriber participant'
        );

        return;
      }

      const subscriber = await this.subscriberRepository.findBySubscriberId(params.environmentId, subscriberExternalId);

      if (!subscriber) {
        this.logger.warn(
          { subscriberExternalId, environmentId: params.environmentId },
          'web chat live emit skipped: subscriber entity not found'
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
          contextKeys: [],
        },
        groupId: params.organizationId,
      });
    } catch (err) {
      this.logger.warn(
        { err, conversationId: params.conversation._id, sequence: envelope.sequence },
        'web chat live WS enqueue failed'
      );
    }
  }
}
