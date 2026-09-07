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
import { DirectionEnum } from '@novu/shared';
import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import {
  SubscriberSession,
  type SubscriberSession as SubscriberSessionData,
} from '../../shared/framework/user.decorator';
import { InboundDispatcher } from '../conversation-runtime/ingress/inbound.dispatcher';
import { WebChatEnabledGuard } from '../shared/web-chat-enabled.guard';
import { assertWebChatEnabled } from '../shared/assert-web-chat-enabled';
import { toWebRequest } from '../shared/util/express-to-web-request';
import { WebChatPublicationService } from './web-chat-publication.service';
import { WebChatSessionVerifier } from './web-chat-session.verifier';
import {
  WebChatConversationMetadataDto,
  ListWebChatConversationsQueryDto,
  ListWebChatConversationsResponseDto,
} from './dtos/web-chat-conversation.dto';
import {
  ListWebChatConversationEventsQueryDto,
  ListWebChatConversationEventsResponseDto,
} from './dtos/list-web-chat-conversation-events.dto';
import { GetWebChatConversationCommand } from './usecases/get-web-chat-conversation/get-web-chat-conversation.command';
import { GetWebChatConversation } from './usecases/get-web-chat-conversation/get-web-chat-conversation.usecase';
import { ListWebChatConversationEventsCommand } from './usecases/list-web-chat-conversation-events/list-web-chat-conversation-events.command';
import { ListWebChatConversationEvents } from './usecases/list-web-chat-conversation-events/list-web-chat-conversation-events.usecase';
import { ListWebChatConversationsCommand } from './usecases/list-web-chat-conversations/list-web-chat-conversations.command';
import { ListWebChatConversations } from './usecases/list-web-chat-conversations/list-web-chat-conversations.usecase';

@Controller('/web-chat')
@ApiExcludeController()
export class WebChatController {
  constructor(
    private readonly sessionVerifier: WebChatSessionVerifier,
    private readonly featureFlagsService: FeatureFlagsService,
    private readonly publicationService: WebChatPublicationService,
    private readonly inboundDispatcher: InboundDispatcher,
    private readonly listWebChatConversations: ListWebChatConversations,
    private readonly getWebChatConversation: GetWebChatConversation,
    private readonly listWebChatConversationEvents: ListWebChatConversationEvents
  ) {}

  /**
   * Adapter webhook ingress (same spine as other channels). Plan limits on web
   * chat accept are enforced synchronously (HTTP 402) before minting `conv_*`;
   * other channels soft-block mid-turn via `PlanLimitGateService`. Optional body
   * `conversationIdentifier` / `id` resumes via ACL.
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

      const agentHash = typeof req.body?.agentHash === 'string' ? req.body.agentHash.trim() : undefined;
      const published = await this.publicationService.resolvePublishedAgent(
        agentIdentifier,
        session.environmentId,
        session.organizationId,
        agentHash
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

  @Get('/conversations')
  @UseGuards(AuthGuard('subscriberJwt'), WebChatEnabledGuard)
  async listConversations(
    @SubscriberSession() subscriberSession: SubscriberSessionData,
    @Query() query: ListWebChatConversationsQueryDto
  ): Promise<ListWebChatConversationsResponseDto> {
    return this.listWebChatConversations.execute(
      ListWebChatConversationsCommand.create({
        environmentId: subscriberSession.environmentId,
        organizationId: subscriberSession.organizationId,
        subscriberId: subscriberSession.subscriberId,
        contextKeys: subscriberSession.contextKeys ?? [],
        after: query.after,
        before: query.before,
        limit: query.limit ?? 50,
        orderBy: query.orderBy || 'lastActivityAt',
        orderDirection: query.orderDirection || DirectionEnum.DESC,
        includeCursor: query.includeCursor,
      })
    );
  }

  @Get('/conversations/:identifier')
  @UseGuards(AuthGuard('subscriberJwt'), WebChatEnabledGuard)
  async getConversation(
    @SubscriberSession() subscriberSession: SubscriberSessionData,
    @Param('identifier') identifier: string
  ): Promise<WebChatConversationMetadataDto> {
    return this.getWebChatConversation.execute(
      GetWebChatConversationCommand.create({
        environmentId: subscriberSession.environmentId,
        organizationId: subscriberSession.organizationId,
        subscriberId: subscriberSession.subscriberId,
        contextKeys: subscriberSession.contextKeys ?? [],
        conversationIdentifier: identifier,
      })
    );
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
        contextKeys: subscriberSession.contextKeys ?? [],
        conversationIdentifier: identifier,
        before: query.before,
        limit: query.limit ?? 50,
      })
    );
  }
}
