import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiExcludeController } from '@nestjs/swagger';
import { PinoLogger } from '@novu/application-generic';
import type { Response } from 'express';
import { ApiCommonResponses } from '../../../shared/framework/response.decorator';
import { SubscriberSession } from '../../../shared/framework/user.decorator';
import { buildWebStreamChannelPrefix } from '../../conversation-runtime/ingress/chat-instance.registry';
import { InboundDispatcher } from '../../conversation-runtime/ingress/inbound.dispatcher';
import { captureAgentException } from '../../shared/errors/capture-agent-sentry';
import { ResolvedAgentConfig } from '../agent-config-resolver.service';
import {
  SendWebActionRequestDto,
  SendWebMessageRequestDto,
  WEB_CONVERSATION_ID_REGEX,
  WebConversationDto,
  WebConversationListResponseDto,
  WebConversationMessagesResponseDto,
} from './dtos/web-chat.dto';
import { ResolveWebAgentContext } from './resolve-web-agent-context.service';
import { WebConversationReader } from './web-conversation-reader.service';
import { WebSseWriter } from './web-sse-writer';
import { WebStreamRelay } from './web-stream-relay.service';
import { encodeWebThreadId } from './web-thread-id.util';

function buildSenderName(session: SubscriberSession): string | undefined {
  const name = [session.firstName, session.lastName].filter(Boolean).join(' ').trim();

  return name.length > 0 ? name : undefined;
}

function parseLimit(limit?: string): number | undefined {
  if (limit === undefined) return undefined;
  const parsed = Number(limit);

  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * Subscriber-facing web chat channel. All routes are guarded by the Inbox
 * subscriber JWT (issued by `POST /v1/inbox/session`); the agent is addressed
 * by identifier and resolved within the JWT's environment. Message and action
 * POSTs answer with an AI SDK UI-message data stream (SSE) fed by the
 * cross-instance Redis relay.
 */
@ApiCommonResponses()
@Controller('/agents/web')
@ApiExcludeController()
export class AgentWebController {
  constructor(
    private readonly resolveContext: ResolveWebAgentContext,
    private readonly relay: WebStreamRelay,
    private readonly inboundDispatcher: InboundDispatcher,
    private readonly reader: WebConversationReader,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @Post('/:agentIdentifier/conversations/:conversationId/messages')
  @UseGuards(AuthGuard('subscriberJwt'))
  async sendMessage(
    @SubscriberSession() session: SubscriberSession,
    @Param('agentIdentifier') agentIdentifier: string,
    @Param('conversationId') conversationId: string,
    @Query('integrationIdentifier') integrationIdentifier: string | undefined,
    @Body() body: SendWebMessageRequestDto,
    @Res() res: Response
  ): Promise<void> {
    const config = await this.resolveTurnContext(session, agentIdentifier, conversationId, integrationIdentifier);

    await this.streamTurn(config, session, conversationId, res, () =>
      this.inboundDispatcher.processWebMessage({
        config,
        subscriberId: session.subscriberId,
        senderName: buildSenderName(session),
        conversationId,
        text: body.text,
        clientMessageId: body.clientMessageId,
      })
    );
  }

  @Post('/:agentIdentifier/conversations/:conversationId/actions')
  @UseGuards(AuthGuard('subscriberJwt'))
  async sendAction(
    @SubscriberSession() session: SubscriberSession,
    @Param('agentIdentifier') agentIdentifier: string,
    @Param('conversationId') conversationId: string,
    @Query('integrationIdentifier') integrationIdentifier: string | undefined,
    @Body() body: SendWebActionRequestDto,
    @Res() res: Response
  ): Promise<void> {
    const config = await this.resolveTurnContext(session, agentIdentifier, conversationId, integrationIdentifier);

    await this.streamTurn(config, session, conversationId, res, () =>
      this.inboundDispatcher.processWebAction({
        config,
        subscriberId: session.subscriberId,
        senderName: buildSenderName(session),
        conversationId,
        actionId: body.actionId,
        value: body.value,
        sourceMessageId: body.sourceMessageId,
      })
    );
  }

  @Get('/:agentIdentifier/conversations')
  @UseGuards(AuthGuard('subscriberJwt'))
  async listConversations(
    @SubscriberSession() session: SubscriberSession,
    @Param('agentIdentifier') agentIdentifier: string,
    @Query('integrationIdentifier') integrationIdentifier: string | undefined,
    @Query('limit') limit: string | undefined,
    @Query('before') before: string | undefined
  ): Promise<WebConversationListResponseDto> {
    const config = await this.resolveContext.resolve({
      agentIdentifier,
      environmentId: session.environmentId,
      organizationId: session.organizationId,
      integrationIdentifier,
    });

    return this.reader.listConversations(config, session.subscriberId, { limit: parseLimit(limit), before });
  }

  @Get('/:agentIdentifier/conversations/:conversationId')
  @UseGuards(AuthGuard('subscriberJwt'))
  async getConversation(
    @SubscriberSession() session: SubscriberSession,
    @Param('agentIdentifier') agentIdentifier: string,
    @Param('conversationId') conversationId: string,
    @Query('integrationIdentifier') integrationIdentifier: string | undefined
  ): Promise<WebConversationDto> {
    const config = await this.resolveTurnContext(session, agentIdentifier, conversationId, integrationIdentifier);
    const conversation = await this.reader.getConversation(config, session.subscriberId, conversationId);
    const dto = conversation && this.reader.toConversationDto(conversation);

    if (!dto) {
      throw new NotFoundException('Conversation not found');
    }

    return dto;
  }

  @Get('/:agentIdentifier/conversations/:conversationId/messages')
  @UseGuards(AuthGuard('subscriberJwt'))
  async listMessages(
    @SubscriberSession() session: SubscriberSession,
    @Param('agentIdentifier') agentIdentifier: string,
    @Param('conversationId') conversationId: string,
    @Query('integrationIdentifier') integrationIdentifier: string | undefined,
    @Query('limit') limit: string | undefined,
    @Query('before') before: string | undefined
  ): Promise<WebConversationMessagesResponseDto> {
    const config = await this.resolveTurnContext(session, agentIdentifier, conversationId, integrationIdentifier);
    const conversation = await this.reader.getConversation(config, session.subscriberId, conversationId);

    // A brand-new conversation id has no entity yet — an empty page, not a 404,
    // so hooks can render a fresh thread before the first message is sent.
    if (!conversation) {
      return { data: [], hasMore: false };
    }

    return this.reader.listMessages(config, conversation, { limit: parseLimit(limit), before });
  }

  private async resolveTurnContext(
    session: SubscriberSession,
    agentIdentifier: string,
    conversationId: string,
    integrationIdentifier: string | undefined
  ): Promise<ResolvedAgentConfig> {
    if (!WEB_CONVERSATION_ID_REGEX.test(conversationId)) {
      throw new BadRequestException(
        'conversationId must be 1-64 characters of [A-Za-z0-9_-] (client-generated, e.g. a UUID without dots or colons)'
      );
    }

    return this.resolveContext.resolve({
      agentIdentifier,
      environmentId: session.environmentId,
      organizationId: session.organizationId,
      integrationIdentifier,
    });
  }

  /**
   * Shared SSE turn transport: subscribe to the relay BEFORE dispatching (a
   * reply published in between would otherwise miss the live stream), stream
   * until the turn settles, and always release the relay subscription.
   * Dispatch failures after headers are sent surface as protocol `error`
   * frames rather than HTTP errors.
   */
  private async streamTurn(
    config: ResolvedAgentConfig,
    session: SubscriberSession,
    conversationId: string,
    res: Response,
    dispatch: () => Promise<unknown>
  ): Promise<void> {
    const platformThreadId = encodeWebThreadId({ subscriberId: session.subscriberId, conversationId });
    const channel = `${buildWebStreamChannelPrefix(config.agentId, config.integrationIdentifier)}:${platformThreadId}`;

    const writer = new WebSseWriter(res);
    const unsubscribe = await this.relay.subscribe(channel, (event) => writer.onRelayEvent(event));

    try {
      writer.begin();

      dispatch().catch((err) => {
        this.logger.error(err, `[agent:${config.agentIdentifier}] Web turn dispatch failed`);
        captureAgentException(err, {
          component: 'agent-web-controller',
          operation: 'dispatch-web-turn',
          agentId: config.agentId,
        });
        writer.fail('Failed to process message');
      });

      await writer.done;
    } finally {
      await unsubscribe();
    }
  }
}
