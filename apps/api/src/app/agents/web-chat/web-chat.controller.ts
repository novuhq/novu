import { Controller, Get, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiExcludeController } from '@nestjs/swagger';
import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import {
  SubscriberSession,
  type SubscriberSession as SubscriberSessionData,
} from '../../shared/framework/user.decorator';
import { AgentConversationEnabledGuard } from '../shared/agent-conversation-enabled.guard';
import { WebChatEnabledGuard } from '../shared/web-chat-enabled.guard';
import {
  ListWebChatConversationEventsQueryDto,
  ListWebChatConversationEventsResponseDto,
} from './dtos/list-web-chat-conversation-events.dto';
import { ListWebChatConversationEventsCommand } from './usecases/list-web-chat-conversation-events/list-web-chat-conversation-events.command';
import { ListWebChatConversationEvents } from './usecases/list-web-chat-conversation-events/list-web-chat-conversation-events.usecase';
import { WebChatIngressService } from './web-chat-ingress.service';

@Controller('/web-chat')
@ApiExcludeController()
export class WebChatController {
  constructor(
    private readonly webChatIngress: WebChatIngressService,
    private readonly listWebChatConversationEvents: ListWebChatConversationEvents
  ) {}

  /**
   * POST auth is adapter `verifySession` only (NV-8448). Nest JWT remains on GET.
   */
  @Post('/conversations')
  async createConversation(@Req() req: ExpressRequest, @Res() res: ExpressResponse): Promise<void> {
    await this.webChatIngress.handleCreateConversation(req, res);
  }

  @Get('/conversations/:identifier/events')
  @UseGuards(AuthGuard('subscriberJwt'), AgentConversationEnabledGuard, WebChatEnabledGuard)
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
        after: query.after,
        before: query.before,
        afterSequence: query.afterSequence ?? 0,
        limit: query.limit ?? 50,
      })
    );
  }
}
