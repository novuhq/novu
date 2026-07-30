import {
  BadRequestException,
  Controller,
  Get,
  HttpException,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiExcludeController } from '@nestjs/swagger';
import { FeatureFlagsService } from '@novu/application-generic';
import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import {
  SubscriberSession,
  type SubscriberSession as SubscriberSessionData,
} from '../../shared/framework/user.decorator';
import { InboundDispatcher } from '../conversation-runtime/ingress/inbound.dispatcher';
import { assertWebChatEnabled } from '../shared/assert-web-chat-enabled';
import { toWebRequest } from '../shared/util/express-to-web-request';
import { WebChatEnabledGuard } from '../shared/web-chat-enabled.guard';
import {
  ListWebChatConversationEventsQueryDto,
  ListWebChatConversationEventsResponseDto,
} from './dtos/list-web-chat-conversation-events.dto';
import { ListWebChatConversationEventsCommand } from './usecases/list-web-chat-conversation-events/list-web-chat-conversation-events.command';
import { ListWebChatConversationEvents } from './usecases/list-web-chat-conversation-events/list-web-chat-conversation-events.usecase';
import { WebChatPublicationService } from './web-chat-publication.service';
import { WebChatSessionVerifier } from './web-chat-session.verifier';

@Controller('/web-chat')
@ApiExcludeController()
export class WebChatController {
  constructor(
    private readonly sessionVerifier: WebChatSessionVerifier,
    private readonly featureFlagsService: FeatureFlagsService,
    private readonly publicationService: WebChatPublicationService,
    private readonly inboundDispatcher: InboundDispatcher,
    private readonly listWebChatConversationEvents: ListWebChatConversationEvents
  ) {}

  /**
   * POST auth boundary is adapter `verifySession` (inside `handleWebhook`).
   * Session is read here only for `assertWebChatEnabled` + publication resolve
   * before `InboundDispatcher` / registry `getOrCreate`.
   */
  @Post('/conversations')
  async createConversation(@Req() req: ExpressRequest, @Res() res: ExpressResponse): Promise<void> {
    try {
      const session = await this.sessionVerifier.verifySession(toWebRequest(req));
      if (!session) {
        res.status(401).json({ message: 'Unauthorized' });

        return;
      }

      await assertWebChatEnabled(this.featureFlagsService, session.organizationId, session.environmentId);

      const agentIdentifier = typeof req.body?.agentId === 'string' ? req.body.agentId.trim() : '';
      if (!agentIdentifier) {
        throw new BadRequestException('agentId is required');
      }

      const published = await this.publicationService.resolvePublishedAgent(
        agentIdentifier,
        session.environmentId,
        session.organizationId
      );

      await this.inboundDispatcher.handleWebhook(published.agentId, published.integrationIdentifier, req, res, {
        source: 'webhook_message',
      });
    } catch (err) {
      if (err instanceof HttpException) {
        res.status(err.getStatus()).json(err.getResponse());

        return;
      }

      throw err;
    }
  }

  @Get('/conversations/:identifier/events')
  @UseGuards(AuthGuard('subscriberJwt'), WebChatEnabledGuard)
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
