import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import type { WebChatProvisionInboundParams } from '@novu/chat-adapter-web';
import { ConversationActivitySenderTypeEnum, ConversationParticipantTypeEnum, isDuplicateKeyError } from '@novu/dal';
import type { ResolvedAgentConfig } from '../channels/agent-config-resolver.service';
import { AgentConversationService } from '../conversation-runtime/conversation/agent-conversation.service';
import { AgentPlatformEnum } from '../shared/enums/agent-platform.enum';

export type WebChatProvisionContext = {
  agentId: string;
  config: ResolvedAgentConfig;
};

/**
 * Durably provisions conversation + participant + user activity before the
 * web-chat adapter returns `201`, so the room is addressable even when a later
 * policy gate blocks the turn.
 */
@Injectable()
export class WebChatInboundProvisionService {
  constructor(
    private readonly conversationService: AgentConversationService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  createProvisionInbound(context: WebChatProvisionContext) {
    return async (params: WebChatProvisionInboundParams): Promise<void> => {
      const { config, agentId } = context;
      const conversation = await this.conversationService.createOrGetConversation({
        environmentId: config.environmentId,
        organizationId: config.organizationId,
        agentId,
        platform: AgentPlatformEnum.WEB_CHAT,
        integrationId: config.integrationId,
        platformThreadId: params.threadId,
        participantId: params.session.subscriberId,
        participantType: ConversationParticipantTypeEnum.SUBSCRIBER,
        platformUserId: params.session.subscriberId,
        firstMessageText: params.text,
        isDirectMessage: true,
        identifier: params.conversationId,
      });

      const sequence = await this.conversationService.allocateWebDeliverySequence(
        config.environmentId,
        config.organizationId,
        conversation._id
      );

      try {
        await this.conversationService.persistInboundMessage({
          conversationId: conversation._id,
          platform: AgentPlatformEnum.WEB_CHAT,
          integrationId: config.integrationId,
          platformThreadId: params.threadId,
          senderType: ConversationActivitySenderTypeEnum.SUBSCRIBER,
          senderId: params.session.subscriberId,
          content: params.text,
          platformMessageId: params.messageId,
          identifier: params.messageId,
          sequence,
          environmentId: config.environmentId,
          organizationId: config.organizationId,
        });
      } catch (err) {
        if (isDuplicateKeyError(err)) {
          this.logger.debug(
            { messageId: params.messageId, conversationId: conversation._id },
            'web chat inbound activity already provisioned'
          );

          return;
        }

        throw err;
      }
    };
  }
}
