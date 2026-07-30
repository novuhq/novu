import { Injectable } from '@nestjs/common';
import { PinoLogger, shortId } from '@novu/application-generic';
import type {
  WebChatDeleteMessageParams,
  WebChatDeliverMessageParams,
  WebChatDeliverMessageResult,
  WebChatEditMessageParams,
} from '@novu/chat-adapter-web';
import { ConversationActivityRepository } from '@novu/dal';
import type { ResolvedAgentConfig } from '../channels/agent-config-resolver.service';
import { AgentConversationService } from '../conversation-runtime/conversation/agent-conversation.service';

export type WebChatPlatformDeliveryContext = {
  agentId: string;
  config: ResolvedAgentConfig;
};

/**
 * Nest-owned platform callbacks for `@novu/chat-adapter-web`.
 * `deliverMessage` is WS / live fan-out only (no Mongo). Nest `persistDelivered`
 * owns durable activities for posts. Edit/delete mutate Mongo because the web UI
 * reads history from ConversationActivity.
 */
@Injectable()
export class WebChatPlatformDeliveryService {
  constructor(
    private readonly conversationService: AgentConversationService,
    private readonly activityRepository: ConversationActivityRepository,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  createDeliverMessage(_context: WebChatPlatformDeliveryContext) {
    return async ({ threadId }: WebChatDeliverMessageParams): Promise<WebChatDeliverMessageResult> => {
      // WS fan-out lands with NV-8409 wiring; still return a stable platform id.
      return { id: `act_${shortId(12)}`, threadId };
    };
  }

  createEditMessage(context: WebChatPlatformDeliveryContext) {
    return async ({
      threadId,
      messageId,
      content,
      richContent,
    }: WebChatEditMessageParams): Promise<WebChatDeliverMessageResult> => {
      const conversation = await this.conversationService.findByPlatformThread(
        context.config.environmentId,
        context.config.organizationId,
        context.agentId,
        context.config.integrationId,
        threadId
      );

      if (!conversation) {
        this.logger.warn({ threadId, messageId }, 'web chat editMessage: conversation not found');

        return { id: messageId, threadId };
      }

      await this.activityRepository.update(
        {
          _environmentId: context.config.environmentId,
          _organizationId: context.config.organizationId,
          _conversationId: conversation._id,
          platformMessageId: messageId,
        },
        {
          $set: {
            content,
            ...(richContent !== undefined ? { richContent } : {}),
          },
        }
      );

      return { id: messageId, threadId };
    };
  }

  createDeleteMessage(context: WebChatPlatformDeliveryContext) {
    return async ({ threadId, messageId }: WebChatDeleteMessageParams): Promise<void> => {
      const conversation = await this.conversationService.findByPlatformThread(
        context.config.environmentId,
        context.config.organizationId,
        context.agentId,
        context.config.integrationId,
        threadId
      );

      if (!conversation) {
        this.logger.warn({ threadId, messageId }, 'web chat deleteMessage: conversation not found');

        return;
      }

      await this.activityRepository.delete({
        _environmentId: context.config.environmentId,
        _organizationId: context.config.organizationId,
        _conversationId: conversation._id,
        platformMessageId: messageId,
      });
    };
  }
}
