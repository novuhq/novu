import {
  BadRequestException,
  Controller,
  Get,
  HttpException,
  NotFoundException,
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
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import {
  SubscriberSession,
  type SubscriberSession as SubscriberSessionData,
} from '../../shared/framework/user.decorator';
import { InboundDispatcher } from '../conversation-runtime/ingress/inbound.dispatcher';
import { AgentConversationEnabledGuard } from '../shared/agent-conversation-enabled.guard';
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
   * POST auth is adapter `verifySession` only (NV-8448). Nest JWT remains on GET.
   * Session is read here solely for feature flags + publication gate (needs env/org
   * before `InboundDispatcher` / registry `getOrCreate`).
   */
  @Post('/conversations')
  async createConversation(@Req() req: ExpressRequest, @Res() res: ExpressResponse): Promise<void> {
    try {
      const session = await this.sessionVerifier.verifySession(toWebRequest(req));
      if (!session) {
        res.status(401).json({ message: 'Unauthorized' });

        return;
      }

      const webChatEnabled = await this.featureFlagsService.getFlag({
        key: FeatureFlagsKeysEnum.IS_AGENT_WEB_CHAT_ENABLED,
        defaultValue: false,
        organization: { _id: session.organizationId },
        environment: { _id: session.environmentId },
      });
      if (!webChatEnabled) {
        throw new NotFoundException();
      }

      const conversationalEnabled = await this.featureFlagsService.getFlag({
        key: FeatureFlagsKeysEnum.IS_CONVERSATIONAL_AGENTS_ENABLED,
        defaultValue: false,
        organization: { _id: session.organizationId },
        environment: { _id: session.environmentId },
      });
      if (!conversationalEnabled) {
        throw new NotFoundException();
      }

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
