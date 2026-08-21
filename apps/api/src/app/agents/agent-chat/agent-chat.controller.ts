import {
  BadRequestException,
  Body,
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
import { AgentChatEnabledGuard } from '../shared/agent-chat-enabled.guard';
import { assertAgentChatEnabled } from '../shared/assert-agent-chat-enabled';
import { toWebRequest } from '../shared/util/express-to-web-request';
import { AgentChatPublicationService } from './agent-chat-publication.service';
import { AgentChatSessionVerifier } from './agent-chat-session.verifier';
import {
  AgentChatConversationMetadataDto,
  ListAgentChatConversationsQueryDto,
  ListAgentChatConversationsResponseDto,
} from './dtos/agent-chat-conversation.dto';
import { CancelAgentRunBodyDto, CancelAgentRunResponseDto } from './dtos/cancel-agent-run.dto';
import {
  ListAgentChatConversationEventsQueryDto,
  ListAgentChatConversationEventsResponseDto,
} from './dtos/list-agent-chat-conversation-events.dto';
import { CancelAgentRunCommand } from './usecases/cancel-agent-run/cancel-agent-run.command';
import { CancelAgentRun } from './usecases/cancel-agent-run/cancel-agent-run.usecase';
import { GetAgentChatConversationCommand } from './usecases/get-agent-chat-conversation/get-agent-chat-conversation.command';
import { GetAgentChatConversation } from './usecases/get-agent-chat-conversation/get-agent-chat-conversation.usecase';
import { ListAgentChatConversationEventsCommand } from './usecases/list-agent-chat-conversation-events/list-agent-chat-conversation-events.command';
import { ListAgentChatConversationEvents } from './usecases/list-agent-chat-conversation-events/list-agent-chat-conversation-events.usecase';
import { ListAgentChatConversationsCommand } from './usecases/list-agent-chat-conversations/list-agent-chat-conversations.command';
import { ListAgentChatConversations } from './usecases/list-agent-chat-conversations/list-agent-chat-conversations.usecase';

@Controller('/agent-chat')
@ApiExcludeController()
export class AgentChatController {
  constructor(
    private readonly sessionVerifier: AgentChatSessionVerifier,
    private readonly featureFlagsService: FeatureFlagsService,
    private readonly publicationService: AgentChatPublicationService,
    private readonly inboundDispatcher: InboundDispatcher,
    private readonly listAgentChatConversations: ListAgentChatConversations,
    private readonly getAgentChatConversation: GetAgentChatConversation,
    private readonly listAgentChatConversationEvents: ListAgentChatConversationEvents,
    private readonly cancelAgentRun: CancelAgentRun
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

      await assertAgentChatEnabled(this.featureFlagsService, session.organizationId, session.environmentId);

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
  @UseGuards(AuthGuard('subscriberJwt'), AgentChatEnabledGuard)
  async listConversations(
    @SubscriberSession() subscriberSession: SubscriberSessionData,
    @Query() query: ListAgentChatConversationsQueryDto
  ): Promise<ListAgentChatConversationsResponseDto> {
    return this.listAgentChatConversations.execute(
      ListAgentChatConversationsCommand.create({
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
  @UseGuards(AuthGuard('subscriberJwt'), AgentChatEnabledGuard)
  async getConversation(
    @SubscriberSession() subscriberSession: SubscriberSessionData,
    @Param('identifier') identifier: string
  ): Promise<AgentChatConversationMetadataDto> {
    return this.getAgentChatConversation.execute(
      GetAgentChatConversationCommand.create({
        environmentId: subscriberSession.environmentId,
        organizationId: subscriberSession.organizationId,
        subscriberId: subscriberSession.subscriberId,
        contextKeys: subscriberSession.contextKeys ?? [],
        conversationIdentifier: identifier,
      })
    );
  }

  /**
   * Server-side run cancellation. Does not disconnect the browser socket — that
   * happens automatically on React unmount via `useAgentChat` unsubscribe.
   */
  @Post('/conversations/:identifier/cancel')
  @UseGuards(AuthGuard('subscriberJwt'), AgentChatEnabledGuard)
  async cancelConversationRun(
    @SubscriberSession() subscriberSession: SubscriberSessionData,
    @Param('identifier') identifier: string,
    @Req() req: ExpressRequest,
    @Body() body: CancelAgentRunBodyDto
  ): Promise<CancelAgentRunResponseDto> {
    const headerKey = typeof req.headers['idempotency-key'] === 'string' ? req.headers['idempotency-key'].trim() : '';
    const bodyKey = typeof body.idempotencyKey === 'string' ? body.idempotencyKey.trim() : '';
    const idempotencyKey = headerKey || bodyKey;

    return this.cancelAgentRun.execute(
      CancelAgentRunCommand.create({
        environmentId: subscriberSession.environmentId,
        organizationId: subscriberSession.organizationId,
        subscriberId: subscriberSession.subscriberId,
        contextKeys: subscriberSession.contextKeys ?? [],
        conversationIdentifier: identifier,
        agentIdentifier: body.agentId.trim(),
        idempotencyKey,
        agentHash: body.agentHash?.trim(),
      })
    );
  }

  @Get('/conversations/:identifier/events')
  @UseGuards(AuthGuard('subscriberJwt'), AgentChatEnabledGuard)
  async listConversationEvents(
    @SubscriberSession() subscriberSession: SubscriberSessionData,
    @Param('identifier') identifier: string,
    @Query() query: ListAgentChatConversationEventsQueryDto
  ): Promise<ListAgentChatConversationEventsResponseDto> {
    return this.listAgentChatConversationEvents.execute(
      ListAgentChatConversationEventsCommand.create({
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
