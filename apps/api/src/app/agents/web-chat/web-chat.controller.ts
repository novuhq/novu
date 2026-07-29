import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiExcludeController } from '@nestjs/swagger';
import { SubscriberSession, type SubscriberSession as SubscriberSessionData } from '../../shared/framework/user.decorator';
import { AgentConversationEnabledGuard } from '../shared/agent-conversation-enabled.guard';
import {
  CreateWebChatConversationRequestDto,
  CreateWebChatConversationResponseDto,
} from './dtos/create-web-chat-conversation.dto';
import {
  ListWebChatConversationEventsQueryDto,
  ListWebChatConversationEventsResponseDto,
} from './dtos/list-web-chat-conversation-events.dto';
import { CreateWebChatConversationCommand } from './usecases/create-web-chat-conversation/create-web-chat-conversation.command';
import { CreateWebChatConversation } from './usecases/create-web-chat-conversation/create-web-chat-conversation.usecase';
import { ListWebChatConversationEventsCommand } from './usecases/list-web-chat-conversation-events/list-web-chat-conversation-events.command';
import { ListWebChatConversationEvents } from './usecases/list-web-chat-conversation-events/list-web-chat-conversation-events.usecase';

@Controller('/web-chat')
@ApiExcludeController()
@UseGuards(AuthGuard('subscriberJwt'), AgentConversationEnabledGuard)
export class WebChatController {
  constructor(
    private readonly createWebChatConversation: CreateWebChatConversation,
    private readonly listWebChatConversationEvents: ListWebChatConversationEvents
  ) {}

  @Post('/conversations')
  @HttpCode(HttpStatus.CREATED)
  async createConversation(
    @SubscriberSession() subscriberSession: SubscriberSessionData,
    @Body() body: CreateWebChatConversationRequestDto
  ): Promise<CreateWebChatConversationResponseDto> {
    return this.createWebChatConversation.execute(
      CreateWebChatConversationCommand.create({
        environmentId: subscriberSession.environmentId,
        organizationId: subscriberSession.organizationId,
        subscriberId: subscriberSession.subscriberId,
        agentIdentifier: body.agentId,
        text: body.text,
      })
    );
  }

  @Get('/conversations/:identifier/events')
  async listConversationEvents(
    @SubscriberSession() subscriberSession: SubscriberSessionData,
    @Param('identifier') identifier: string,
    @Query() query: ListWebChatConversationEventsQueryDto
  ): Promise<ListWebChatConversationEventsResponseDto> {
    return this.listWebChatConversationEvents.execute(
      ListWebChatConversationEventsCommand.create({
        environmentId: subscriberSession.environmentId,
        organizationId: subscriberSession.organizationId,
        subscriberId: subscriberSession.subscriberId,
        conversationIdentifier: identifier,
        afterSequence: query.afterSequence ?? 0,
        limit: query.limit ?? 50,
      })
    );
  }
}
