import { randomUUID } from 'node:crypto';
import { BadRequestException, Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import type { NovuWebRawMessage } from '@novu/chat-adapter-web';
import type { Chat, Message } from 'chat';
import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import {
  AgentConfigResolver,
  AgentConfigResolveSource,
  ResolvedAgentConfig,
} from '../../channels/agent-config-resolver.service';
import { encodeWebThreadId } from '../../channels/web/web-thread-id.util';
import type { AgentEmailActionClaims } from '../../email/agent-email-action-token.service';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import { sendWebResponse, toWebRequest } from '../../shared/util/express-to-web-request';
import { ChatInstanceRegistry, InboundCallbacks } from './chat-instance.registry';

export interface ProcessWebMessageParams {
  config: ResolvedAgentConfig;
  subscriberId: string;
  senderName?: string;
  conversationId: string;
  text: string;
  clientMessageId?: string;
}

export interface ProcessWebActionParams {
  config: ResolvedAgentConfig;
  subscriberId: string;
  senderName?: string;
  conversationId: string;
  actionId: string;
  value?: string;
  sourceMessageId?: string;
}

/**
 * Thrown by `InboundDispatcher.processEmailAction` when a failure is provably pre-dispatch —
 * i.e. token validation, agent-config lookup, or chat/adapter setup failed before the chat
 * SDK had a chance to invoke the agent's `onAction` handler. Callers can safely retry these
 * via single-use token release. Any other error (including raw exceptions out of
 * `chat.processAction`) MUST be treated as potentially post-dispatch and not replayed.
 */
export class AgentActionPreDispatchError extends Error {
  readonly preDispatch = true as const;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'AgentActionPreDispatchError';
    if (cause !== undefined) {
      (this as { cause?: unknown }).cause = cause;
    }
  }
}

@Injectable()
export class InboundDispatcher {
  constructor(
    private readonly logger: PinoLogger,
    private readonly registry: ChatInstanceRegistry,
    private readonly agentConfigResolver: AgentConfigResolver
  ) {
    this.logger.setContext(this.constructor.name);
  }

  registerInboundCallbacks(callbacks: InboundCallbacks): void {
    this.registry.registerInboundCallbacks(callbacks);
  }

  async handleWebhook(
    agentId: string,
    integrationIdentifier: string,
    req: ExpressRequest,
    res: ExpressResponse,
    options: { source: AgentConfigResolveSource }
  ) {
    const config = await this.agentConfigResolver.resolve(agentId, integrationIdentifier, {
      source: options.source,
    });
    const { platform } = config;
    const instanceKey = `${agentId}:${integrationIdentifier}`;

    const chat = await this.registry.getOrCreate(instanceKey, agentId, platform, config);
    const handler = chat.webhooks[platform];
    if (!handler) {
      throw new BadRequestException(`Platform ${platform} not configured for agent ${agentId}`);
    }

    const webRequest = toWebRequest(req);
    const webResponse = await handler(webRequest);

    await sendWebResponse(webResponse, res);
  }

  /**
   * Dispatches a verified email-button click into the chat SDK so it flows through the same
   * `chat.onAction` → `AgentInboundHandler.handleAction` → bridge `onAction` path that
   * inbound platforms (Slack/Teams) already use.
   */
  async processEmailAction(claims: AgentEmailActionClaims): Promise<void> {
    const { agentId, integrationIdentifier } = claims;

    let chat: Chat;
    let emailAdapter: ReturnType<Chat['getAdapter']>;
    try {
      const config = await this.agentConfigResolver.resolve(agentId, integrationIdentifier);

      if (config.platform !== AgentPlatformEnum.EMAIL) {
        throw new BadRequestException(
          `Agent ${agentId} integration ${integrationIdentifier} is not configured for the email platform`
        );
      }

      const instanceKey = `${agentId}:${integrationIdentifier}`;
      chat = await this.registry.getOrCreate(instanceKey, agentId, config.platform, config);

      emailAdapter = chat.getAdapter(AgentPlatformEnum.EMAIL);
      if (!emailAdapter) {
        throw new BadRequestException(`Email adapter not available for agent ${agentId}`);
      }
    } catch (err) {
      throw new AgentActionPreDispatchError('Failed to resolve agent context before dispatching email action', err);
    }

    await chat.processAction(
      {
        adapter: emailAdapter,
        actionId: claims.actionId,
        value: claims.value,
        messageId: claims.messageId,
        threadId: claims.threadId,
        user: {
          userId: claims.userIdentifier,
          userName: claims.userIdentifier,
          fullName: claims.userIdentifier,
          isBot: false,
          isMe: false,
        },
        raw: {},
      },
      undefined
    );
  }

  /**
   * Dispatches a subscriber-JWT-authenticated web chat message into the chat
   * SDK natively (`chat.processMessage`) — the web platform has no webhook.
   * From there the flow is identical to every other platform: onNewMention /
   * onSubscribedMessage → AgentInboundHandler.handle → plan gates →
   * conversation persistence → runtime dispatch.
   */
  async processWebMessage(params: ProcessWebMessageParams): Promise<{ platformThreadId: string }> {
    const { config } = params;
    const { chat, adapter } = await this.resolveWebChatInstance(config);
    const platformThreadId = encodeWebThreadId({
      subscriberId: params.subscriberId,
      conversationId: params.conversationId,
    });

    const raw: NovuWebRawMessage = {
      id: params.clientMessageId ?? `webu-${randomUUID()}`,
      subscriberId: params.subscriberId,
      conversationId: params.conversationId,
      text: params.text,
      senderName: params.senderName,
      createdAt: new Date().toISOString(),
    };

    const message = (adapter as { parseMessage(rawMessage: NovuWebRawMessage): Message }).parseMessage(raw);

    await chat.processMessage(adapter, platformThreadId, message);

    return { platformThreadId };
  }

  /** Routes a web card interaction into the same onAction path as other platforms. */
  async processWebAction(params: ProcessWebActionParams): Promise<{ platformThreadId: string }> {
    const { config } = params;
    const { chat, adapter } = await this.resolveWebChatInstance(config);
    const platformThreadId = encodeWebThreadId({
      subscriberId: params.subscriberId,
      conversationId: params.conversationId,
    });

    await chat.processAction(
      {
        adapter,
        actionId: params.actionId,
        value: params.value,
        messageId: params.sourceMessageId ?? '',
        threadId: platformThreadId,
        user: {
          userId: params.subscriberId,
          userName: params.subscriberId,
          fullName: params.senderName ?? params.subscriberId,
          isBot: false,
          isMe: false,
        },
        raw: {},
      },
      undefined
    );

    return { platformThreadId };
  }

  private async resolveWebChatInstance(config: ResolvedAgentConfig) {
    if (config.platform !== AgentPlatformEnum.WEB) {
      throw new BadRequestException(
        `Integration ${config.integrationIdentifier} is not configured for the web platform`
      );
    }

    const instanceKey = `${config.agentId}:${config.integrationIdentifier}`;
    const chat = await this.registry.getOrCreate(instanceKey, config.agentId, config.platform, config);
    const adapter = chat.getAdapter(AgentPlatformEnum.WEB);
    if (!adapter) {
      throw new BadRequestException(`Web adapter not available for agent ${config.agentId}`);
    }

    return { chat, adapter };
  }
}
