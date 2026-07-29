import { Injectable } from '@nestjs/common';
import { shortId } from '@novu/application-generic';
import { AgentConversationService } from '../conversation-runtime/conversation/agent-conversation.service';
import type { WebChatDeliverMessage } from './web-chat-inbound.adapter';

export type WebChatThreadDeliveryContext = {
  agentId: string;
  integrationId: string;
  environmentId: string;
  organizationId: string;
  agentIdentifier: string;
};

@Injectable()
export class WebChatThreadDeliveryService {
  constructor(private readonly conversationService: AgentConversationService) {}

  createDeliverMessage(context: WebChatThreadDeliveryContext): WebChatDeliverMessage {
    return async ({ threadId, content, richContent }) => {
      const conversation = await this.conversationService.findByPlatformThread(
        context.environmentId,
        context.organizationId,
        context.agentId,
        context.integrationId,
        threadId
      );

      if (!conversation) {
        // Gate/limit replies can post before openConversation creates the thread.
        // Ephemeral ack only — durable agent messages use OutboundGateway.deliver().
        return { id: `act_${shortId(12)}`, threadId };
      }

      const channel = this.conversationService.getPrimaryChannel(conversation);
      const activityId = `act_${shortId(12)}`;
      const activity = await this.conversationService.persistAgentMessage({
        conversationId: conversation._id,
        channel,
        platformThreadId: threadId,
        platformMessageId: activityId,
        identifier: activityId,
        agentIdentifier: context.agentIdentifier,
        content,
        richContent,
        environmentId: context.environmentId,
        organizationId: context.organizationId,
      });

      return { id: activity.identifier, threadId: activity.platformThreadId ?? threadId };
    };
  }
}
