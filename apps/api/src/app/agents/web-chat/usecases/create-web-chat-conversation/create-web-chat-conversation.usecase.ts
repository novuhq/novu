import { BadRequestException, Injectable } from '@nestjs/common';
import { shortId } from '@novu/application-generic';
import { AgentConfigResolver } from '../../../channels/agent-config-resolver.service';
import { AgentConversationService } from '../../../conversation-runtime/conversation/agent-conversation.service';
import { AgentInboundHandler } from '../../../conversation-runtime/ingress/inbound-turn.handler';
import { AgentEventEnum } from '../../../shared/enums/agent-event.enum';
import { AgentPlatformEnum } from '../../../shared/enums/agent-platform.enum';
import { buildWebChatMessage, buildWebChatThread } from '../../web-chat-inbound.adapter';
import { WebChatPublicationService } from '../../web-chat-publication.service';
import { WebChatThreadDeliveryService } from '../../web-chat-thread-delivery.service';
import { CreateWebChatConversationCommand } from './create-web-chat-conversation.command';

@Injectable()
export class CreateWebChatConversation {
  constructor(
    private readonly publicationService: WebChatPublicationService,
    private readonly agentConfigResolver: AgentConfigResolver,
    private readonly inboundHandler: AgentInboundHandler,
    private readonly conversationService: AgentConversationService,
    private readonly threadDelivery: WebChatThreadDeliveryService
  ) {}

  async execute(command: CreateWebChatConversationCommand): Promise<{ identifier: string }> {
    const text = command.text.trim();
    if (!text) {
      throw new BadRequestException('text is required');
    }

    const published = await this.publicationService.resolvePublishedAgent(
      command.agentIdentifier,
      command.environmentId,
      command.organizationId
    );

    const config = await this.agentConfigResolver.resolve(published.agentId, published.integrationIdentifier);

    if (config.platform !== AgentPlatformEnum.WEB_CHAT) {
      throw new BadRequestException('This agent is not available on web chat');
    }

    const conversationIdentifier = `conv_${shortId(12)}`;
    const deliverMessage = this.threadDelivery.createDeliverMessage({
      agentId: published.agentId,
      integrationId: config.integrationId,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      agentIdentifier: published.agentIdentifier,
    });
    const thread = buildWebChatThread(conversationIdentifier, deliverMessage);
    const message = buildWebChatMessage(command.subscriberId, text);

    await this.inboundHandler.handle(published.agentId, config, thread, message, AgentEventEnum.ON_MESSAGE, {
      conversationIdentifier,
    });

    const conversation = await this.conversationService.findByPlatformThread(
      command.environmentId,
      command.organizationId,
      published.agentId,
      config.integrationId,
      conversationIdentifier
    );

    if (!conversation) {
      throw new BadRequestException('Failed to create web chat conversation');
    }

    return { identifier: conversation.identifier };
  }
}
