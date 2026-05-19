import { Injectable, NotFoundException } from '@nestjs/common';
import { AnalyticsService, PinoLogger } from '@novu/application-generic';
import {
  AgentRepository,
  ChannelEndpointRepository,
  ConversationActivityEntity,
  ConversationActivitySenderTypeEnum,
  ConversationParticipantTypeEnum,
  EnvironmentRepository,
  SubscriberRepository,
} from '@novu/dal';
import type { AgentAction } from '@novu/framework';
import { ENDPOINT_TYPES } from '@novu/shared';
import type { CardChild, CardElement, EmojiValue, Message, Thread } from 'chat';
import { trackAgentInboundAction, trackAgentInboundMessage, trackAgentInboundReaction } from '../agent-analytics';
import { AgentEventEnum } from '../dtos/agent-event.enum';
import { AgentPlatformEnum, PLATFORMS_WITH_TYPING_INDICATOR } from '../dtos/agent-platform.enum';
import { LinkTelegramChatToSubscriberCommand } from '../usecases/link-telegram-chat-to-subscriber/link-telegram-chat-to-subscriber.command';
import { LinkTelegramChatToSubscriber } from '../usecases/link-telegram-chat-to-subscriber/link-telegram-chat-to-subscriber.usecase';
import { AgentAttachmentStorage, type StoredAttachment } from './agent-attachment-storage.service';
import { ResolvedAgentConfig } from './agent-config-resolver.service';
import { AgentConversationService, getInboundActivityPreview } from './agent-conversation.service';
import { AgentSubscriberResolver } from './agent-subscriber-resolver.service';
import { BridgeExecutorService, type BridgeReaction, NoBridgeUrlError } from './bridge-executor.service';
import { ManagedExecutorService } from './managed-executor.service';
import { TelegramStartCodeService } from './telegram-start-code.service';

/**
 * `/start <payload>` is Telegram's deep-link mechanism. Telegram delivers it as
 * a regular message whose text is exactly `/start ` followed by the URL-decoded
 * payload (max 64 base64url characters per the API). We only treat the message
 * as a subscriber-link request when it has a non-empty payload.
 */
const TELEGRAM_START_COMMAND = /^\/start(?:@[\w_]+)?\s+(\S+)\s*$/;

function extractTelegramStartToken(text: string | undefined): string | null {
  if (!text) return null;
  const match = TELEGRAM_START_COMMAND.exec(text.trim());
  return match ? match[1] : null;
}

function extractTelegramChatId(thread: Thread): string | null {
  const raw = thread.channelId;
  if (!raw) return null;
  // chat-sdk Telegram adapter exposes `chat.id` as the bare numeric id (string).
  // For safety against an upstream change to a namespaced form, peel off any
  // `telegram:` prefix before persistence so the value we store matches what
  // `TelegramChatProvider.sendMessage` will POST to the bot API.
  return raw.startsWith('telegram:') ? raw.slice('telegram:'.length) : raw;
}

const SUBSCRIBER_LINK_SUCCESS_REPLY = "You're connected. Notifications from this agent will now reach you here.";
const SUBSCRIBER_LINK_DUPLICATE_REPLY =
  'This chat is already connected to your account — no changes needed. Send any message to try the agent out.';
const SUBSCRIBER_LINK_INVALID_REPLY =
  "This connection link isn't valid — open a fresh link from your Novu dashboard and try again.";
const SUBSCRIBER_LINK_EXPIRED_REPLY =
  'This connection link has expired. Open a new link from your Novu dashboard and try again.';
const SUBSCRIBER_LINK_WRONG_BOT_REPLY =
  "This connection link wasn't issued for this bot. Open the link from your Novu dashboard again (or request a new one) and make sure you're messaging the same bot you configured.";

const ACKNOWLEDGE_FALLBACK_EMOJI = 'eyes' as const;

const ONBOARDING_NO_BRIDGE_TEXT =
  "I'm live but running on defaults. Connect your agent in the dashboard to customize how I respond.";

function buildNoBridgeReply(dashboardUrl?: string): CardElement {
  const children: CardChild[] = [{ type: 'text', content: ONBOARDING_NO_BRIDGE_TEXT }];

  if (dashboardUrl) {
    children.push(
      { type: 'divider' },
      {
        type: 'actions',
        children: [{ type: 'link-button', label: 'Continue setup', url: dashboardUrl, style: 'primary' }],
      }
    );
  }

  return { type: 'card', children };
}

const BRIDGE_OFFLINE_REPLY_MARKDOWN = `*The agent is currently offline.*

The agent is unavailable right now. Please try again later.`;

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function getMessageRawEvent(message: Message): Record<string, unknown> | undefined {
  const raw = asRecord(message.raw);

  return asRecord(raw?.event) ?? raw;
}

function getInboundPlatformThreadId(platform: AgentPlatformEnum, thread: Thread, message: Message): string {
  const rawEvent = getMessageRawEvent(message);
  const rawThreadTs = rawEvent?.thread_ts;
  const threadRoot = typeof rawThreadTs === 'string' && rawThreadTs.length > 0 ? rawThreadTs : message.id;

  if (platform !== AgentPlatformEnum.SLACK || !thread.isDM || !threadRoot || !thread.id.endsWith(':')) {
    return thread.id;
  }

  return `${thread.id}${threadRoot}`;
}

function applyPlatformThreadIdToSerializedThread(serializedThread: Record<string, unknown>, platformThreadId: string) {
  serializedThread.id = platformThreadId;

  const currentMessage = asRecord(serializedThread.currentMessage ?? serializedThread.message);
  if (!currentMessage) {
    return;
  }

  currentMessage.threadId = platformThreadId;
}

function applyPlatformThreadIdToThread(thread: Thread, platformThreadId: string) {
  // Chat SDK currently gives top-level Slack DMs an empty-root thread id (`slack:D...:`).
  // Patch the in-memory handle before posting fallback replies so Slack receives a real thread root.
  (thread as unknown as { id: string }).id = platformThreadId;
}

function mapStoredAttachmentsFromRichContent(richContent?: Record<string, unknown>): StoredAttachment[] {
  const rawAttachments = richContent?.attachments;

  if (!Array.isArray(rawAttachments)) {
    return [];
  }

  return rawAttachments.flatMap((item) => {
    if (!item || typeof item !== 'object') {
      return [];
    }

    const attachment = item as Record<string, unknown>;
    const storageKey = attachment.storageKey;

    if (typeof storageKey !== 'string' || storageKey.length === 0) {
      return [];
    }

    return [
      {
        type: typeof attachment.type === 'string' ? attachment.type : 'file',
        name: typeof attachment.name === 'string' ? attachment.name : undefined,
        mimeType: typeof attachment.mimeType === 'string' ? attachment.mimeType : undefined,
        size: typeof attachment.size === 'number' ? attachment.size : undefined,
        storageKey,
        url: typeof attachment.url === 'string' ? attachment.url : undefined,
      },
    ];
  });
}

function findSourceMessageStoredAttachments(
  history: ConversationActivityEntity[],
  messageIds: string[]
): StoredAttachment[] | undefined {
  const messageIdSet = new Set(messageIds);
  const sourceActivity = history.find(
    (activity) => activity.platformMessageId && messageIdSet.has(activity.platformMessageId)
  );

  if (!sourceActivity) {
    return undefined;
  }

  const storedAttachments = mapStoredAttachmentsFromRichContent(sourceActivity.richContent);

  if (!storedAttachments.length) {
    return undefined;
  }

  return storedAttachments;
}

export interface InboundReactionEvent {
  emoji: EmojiValue;
  added: boolean;
  messageId: string;
  message?: Message;
  thread?: Thread;
  user?: { userId: string; fullName?: string; userName?: string };
}

@Injectable()
export class AgentInboundHandler {
  constructor(
    private readonly logger: PinoLogger,
    private readonly subscriberResolver: AgentSubscriberResolver,
    private readonly conversationService: AgentConversationService,
    private readonly bridgeExecutor: BridgeExecutorService,
    private readonly managedExecutor: ManagedExecutorService,
    private readonly agentRepository: AgentRepository,
    private readonly subscriberRepository: SubscriberRepository,
    private readonly environmentRepository: EnvironmentRepository,
    private readonly analyticsService: AnalyticsService,
    private readonly attachmentStorage: AgentAttachmentStorage,
    private readonly startCodeService: TelegramStartCodeService,
    private readonly channelEndpointRepository: ChannelEndpointRepository,
    private readonly linkTelegramChatToSubscriber: LinkTelegramChatToSubscriber
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async handle(
    agentId: string,
    config: ResolvedAgentConfig,
    thread: Thread,
    message: Message,
    event: AgentEventEnum
  ): Promise<void> {
    if (config.platform === AgentPlatformEnum.TELEGRAM) {
      const startToken = extractTelegramStartToken(message.text);
      if (startToken) {
        const consumed = await this.handleTelegramSubscriberLink(agentId, config, thread, message, startToken);
        if (consumed) {
          return;
        }
      }
    }

    const subscriberId = await this.subscriberResolver
      .resolve({
        environmentId: config.environmentId,
        organizationId: config.organizationId,
        platform: config.platform,
        platformUserId: message.author.userId,
        integrationIdentifier: config.integrationIdentifier,
      })
      .catch((err) => {
        this.logger.warn(err, `[agent:${agentId}] Subscriber resolution failed, continuing without subscriber`);

        return null;
      });

    const participantId = subscriberId ?? `${config.platform}:${message.author.userId}`;
    const participantType = subscriberId
      ? ConversationParticipantTypeEnum.SUBSCRIBER
      : ConversationParticipantTypeEnum.PLATFORM_USER;
    const platformThreadId = getInboundPlatformThreadId(config.platform, thread, message);

    const conversation = await this.conversationService.createOrGetConversation({
      environmentId: config.environmentId,
      organizationId: config.organizationId,
      agentId,
      platform: config.platform,
      integrationId: config.integrationId,
      platformThreadId,
      participantId,
      participantType,
      platformUserId: message.author.userId,
      firstMessageText: getInboundActivityPreview(message.text, {
        hasPlatformAttachments: Boolean(message.attachments?.length),
      }),
    });

    const senderType = subscriberId
      ? ConversationActivitySenderTypeEnum.SUBSCRIBER
      : ConversationActivitySenderTypeEnum.PLATFORM_USER;

    let storedAttachments: StoredAttachment[] | undefined;

    if (message.attachments?.length) {
      storedAttachments = await this.attachmentStorage.storeInbound(message.attachments, {
        organizationId: config.organizationId,
        environmentId: config.environmentId,
        conversationId: String(conversation._id),
        platformMessageId: message.id ?? `unknown-${Date.now()}`,
        platform: config.platform,
      });
    }

    const richContent = storedAttachments?.length
      ? {
          attachments: storedAttachments.map(({ type, name, mimeType, size, storageKey }) => ({
            type,
            name,
            mimeType,
            size,
            storageKey,
          })),
        }
      : undefined;

    const primaryChannel = this.conversationService.getPrimaryChannel(conversation);
    const isFirstMessage = !primaryChannel.firstPlatformMessageId;

    await this.conversationService.persistInboundMessage({
      conversationId: conversation._id,
      platform: config.platform,
      integrationId: config.integrationId,
      platformThreadId,
      senderType,
      senderId: participantId,
      senderName: message.author.fullName,
      content: message.text,
      richContent,
      hasPlatformAttachments: Boolean(message.attachments?.length),
      platformMessageId: message.id,
      environmentId: config.environmentId,
      organizationId: config.organizationId,
    });

    trackAgentInboundMessage(this.analyticsService, {
      organizationId: config.organizationId,
      environmentId: config.environmentId,
      agentId,
      agentIdentifier: config.agentIdentifier,
      integrationIdentifier: config.integrationIdentifier,
      platform: config.platform,
      conversationId: conversation._id,
      agentEvent: event,
      isFirstMessageInThread: isFirstMessage,
    });

    if (isFirstMessage && message.id) {
      this.conversationService
        .setFirstPlatformMessageId(
          config.environmentId,
          config.organizationId,
          conversation._id,
          platformThreadId,
          message.id
        )
        .catch((err) => {
          this.logger.warn(err, `[agent:${agentId}] Failed to store firstPlatformMessageId`);
        });
    }

    if (config.acknowledgeOnReceived) {
      const supportsTyping = PLATFORMS_WITH_TYPING_INDICATOR.has(config.platform);

      if (supportsTyping) {
        await thread.startTyping('Thinking...');
      } else if (isFirstMessage && message.id) {
        thread
          .createSentMessageFromMessage(message)
          .addReaction(ACKNOWLEDGE_FALLBACK_EMOJI)
          .catch((err) => {
            this.logger.warn(err, `[agent:${agentId}] Failed to add ack reaction to first message`);
          });
      }
    }

    const serializedThread = thread.toJSON() as unknown as Record<string, unknown>;
    applyPlatformThreadIdToSerializedThread(serializedThread, platformThreadId);
    await this.conversationService.updateChannelThread(
      config.environmentId,
      config.organizationId,
      conversation._id,
      platformThreadId,
      serializedThread
    );

    const [subscriber, history] = await Promise.all([
      subscriberId
        ? this.subscriberRepository.findBySubscriberId(config.environmentId, subscriberId)
        : Promise.resolve(null),
      this.conversationService.getHistory(config.environmentId, conversation._id),
    ]);

    const agent = await this.agentRepository.findOne({ _id: agentId, _environmentId: config.environmentId }, [
      '_id',
      'runtime',
      'managedRuntime',
    ]);
    const executionContext = {
      event,
      config,
      conversation,
      subscriber,
      history,
      message,
      platformContext: { threadId: platformThreadId, channelId: thread.channelId, isDM: thread.isDM },
      storedAttachments: message.attachments?.length ? storedAttachments : undefined,
    };

    try {
      if (agent?.runtime === 'managed' && agent.managedRuntime) {
        await this.managedExecutor.execute(executionContext, agent);
      } else {
        await this.bridgeExecutor.execute({
          ...executionContext,
          onBridgeFailure: async () => {
            applyPlatformThreadIdToThread(thread, platformThreadId);
            const sent = await thread.post(BRIDGE_OFFLINE_REPLY_MARKDOWN);
            const channel = this.conversationService.getPrimaryChannel(conversation);
            await this.conversationService.persistAgentMessage({
              conversationId: conversation._id,
              channel,
              platformMessageId: (sent as { id?: string })?.id ?? '',
              agentIdentifier: config.agentIdentifier,
              content: BRIDGE_OFFLINE_REPLY_MARKDOWN,
              environmentId: config.environmentId,
              organizationId: config.organizationId,
            });
          },
        });
      }
    } catch (err) {
      if (err instanceof NoBridgeUrlError) {
        applyPlatformThreadIdToThread(thread, platformThreadId);

        let dashboardUrl: string | undefined;
        const dashboardBase = process.env.DASHBOARD_URL || process.env.FRONT_BASE_URL;
        if (dashboardBase) {
          try {
            const environment = await this.environmentRepository.findOne({ _id: config.environmentId });
            if (environment?.identifier) {
              dashboardUrl = `${dashboardBase}/env/${environment.identifier}/agents/${config.agentIdentifier}/overview`;
            }
          } catch (lookupErr) {
            this.logger.warn(
              lookupErr,
              `[agent:${config.agentIdentifier}] Failed to resolve dashboard URL for no-bridge reply`
            );
          }
        }

        const reply = buildNoBridgeReply(dashboardUrl);
        const sent = await thread.post(reply);
        const channel = this.conversationService.getPrimaryChannel(conversation);
        await this.conversationService.persistAgentMessage({
          conversationId: conversation._id,
          channel,
          platformMessageId: (sent as { id?: string })?.id ?? '',
          agentIdentifier: config.agentIdentifier,
          content: ONBOARDING_NO_BRIDGE_TEXT,
          richContent: { card: reply },
          environmentId: config.environmentId,
          organizationId: config.organizationId,
        });

        return;
      }

      throw err;
    }
  }

  /**
   * Process a Telegram `/start <code>` deep-link payload as a subscriber-link
   * request. `/start <code>` is control input and is always consumed here —
   * the handler never falls through to normal bridge processing so the code
   * cannot be persisted or forwarded as regular content.
   */
  private async handleTelegramSubscriberLink(
    agentId: string,
    config: ResolvedAgentConfig,
    thread: Thread,
    message: Message,
    code: string
  ): Promise<boolean> {
    const chatId = extractTelegramChatId(thread);
    if (!chatId) {
      this.logger.warn(
        `[agent:${agentId}] Telegram /start payload received but channelId is missing — dropping as invalid control input`
      );
      await this.safePostInboundReply(thread, SUBSCRIBER_LINK_INVALID_REPLY, agentId, message);

      return true;
    }

    const result = await this.startCodeService.consumeIfMatches(code, {
      environmentId: config.environmentId,
      organizationId: config.organizationId,
      integrationId: config.integrationId,
      agentIdentifier: config.agentIdentifier,
    });

    if (result.status === 'mismatch') {
      await this.safePostInboundReply(thread, SUBSCRIBER_LINK_WRONG_BOT_REPLY, agentId, message);

      return true;
    }

    if (result.status === 'consumed') {
      const { payload } = result;
      try {
        const linkResult = await this.linkTelegramChatToSubscriber.execute(
          LinkTelegramChatToSubscriberCommand.create({
            environmentId: payload._environmentId,
            organizationId: payload._organizationId,
            agentIdentifier: payload.agentIdentifier,
            integrationId: payload._integrationId,
            subscriberId: payload.subscriberId,
            chatId,
          })
        );

        const reply = linkResult.created ? SUBSCRIBER_LINK_SUCCESS_REPLY : SUBSCRIBER_LINK_DUPLICATE_REPLY;
        await this.safePostInboundReply(thread, reply, agentId, message);
      } catch (err) {
        if (err instanceof NotFoundException) {
          await this.safePostInboundReply(thread, SUBSCRIBER_LINK_INVALID_REPLY, agentId, message);
        } else {
          this.logger.error(err, `[agent:${agentId}] Unexpected failure linking Telegram chat to subscriber`);
          await this.safePostInboundReply(thread, SUBSCRIBER_LINK_INVALID_REPLY, agentId, message);
        }
      }

      return true;
    }

    const existing = await this.channelEndpointRepository.findByPlatformIdentity({
      _environmentId: config.environmentId,
      _organizationId: config.organizationId,
      integrationIdentifier: config.integrationIdentifier,
      type: ENDPOINT_TYPES.TELEGRAM_CHAT,
      endpointField: 'chatId',
      endpointValue: chatId,
    });

    const reply = existing ? SUBSCRIBER_LINK_DUPLICATE_REPLY : SUBSCRIBER_LINK_EXPIRED_REPLY;
    await this.safePostInboundReply(thread, reply, agentId, message);

    return true;
  }

  private async safePostInboundReply(thread: Thread, text: string, agentId: string, message: Message): Promise<void> {
    try {
      await thread.post(text);
    } catch (err) {
      this.logger.warn(
        err,
        `[agent:${agentId}] Failed to post Telegram subscriber-link reply for inbound message ${message.id ?? '<unknown>'}`
      );
    }
  }

  async handleReaction(agentId: string, config: ResolvedAgentConfig, event: InboundReactionEvent): Promise<void> {
    const threadId = event.thread?.id;
    if (!threadId) {
      this.logger.warn(`[agent:${agentId}] Reaction received without thread context, skipping`);

      return;
    }

    const conversation = await this.conversationService.findByPlatformThread(
      config.environmentId,
      config.organizationId,
      config.agentId,
      config.integrationId,
      threadId
    );

    if (!conversation) {
      return;
    }

    trackAgentInboundReaction(this.analyticsService, {
      organizationId: config.organizationId,
      environmentId: config.environmentId,
      agentId,
      agentIdentifier: config.agentIdentifier,
      integrationIdentifier: config.integrationIdentifier,
      platform: config.platform,
      conversationId: conversation._id,
    });

    const platformUserId = event.user?.userId;

    const subscriberId = platformUserId
      ? await this.subscriberResolver
          .resolve({
            environmentId: config.environmentId,
            organizationId: config.organizationId,
            platform: config.platform,
            platformUserId,
            integrationIdentifier: config.integrationIdentifier,
          })
          .catch((err) => {
            this.logger.warn(
              err,
              `[agent:${agentId}] Subscriber resolution failed for reaction, continuing without subscriber`
            );

            return null;
          })
      : null;

    const [subscriber, history] = await Promise.all([
      subscriberId
        ? this.subscriberRepository.findBySubscriberId(config.environmentId, subscriberId)
        : Promise.resolve(null),
      this.conversationService.getHistory(config.environmentId, conversation._id),
    ]);

    const sourceMessageIds = [event.messageId, event.message?.id].filter((id): id is string => Boolean(id));
    let sourceMessageStoredAttachments = findSourceMessageStoredAttachments(history, sourceMessageIds);

    if (!sourceMessageStoredAttachments && event.message?.attachments?.length) {
      sourceMessageStoredAttachments = await this.attachmentStorage.storeInbound(event.message.attachments, {
        organizationId: config.organizationId,
        environmentId: config.environmentId,
        conversationId: String(conversation._id),
        platformMessageId: event.message.id ?? event.messageId ?? `unknown-${Date.now()}`,
        platform: config.platform,
      });
    }

    const reactionPayload: BridgeReaction = {
      emoji: event.emoji.name,
      added: event.added,
      messageId: event.messageId,
      sourceMessage: event.message,
      sourceMessageStoredAttachments: sourceMessageStoredAttachments?.length
        ? sourceMessageStoredAttachments
        : undefined,
    };

    await this.bridgeExecutor.execute({
      event: AgentEventEnum.ON_REACTION,
      config,
      conversation,
      subscriber,
      history,
      message: null,
      platformContext: {
        threadId,
        channelId: event.thread?.channelId ?? '',
        isDM: event.thread?.isDM ?? false,
      },
      reaction: reactionPayload,
    });
  }

  async handleAction(
    agentId: string,
    config: ResolvedAgentConfig,
    thread: Thread,
    action: AgentAction,
    userId: string
  ): Promise<void> {
    const subscriberId = await this.subscriberResolver
      .resolve({
        environmentId: config.environmentId,
        organizationId: config.organizationId,
        platform: config.platform,
        platformUserId: userId,
        integrationIdentifier: config.integrationIdentifier,
      })
      .catch((err) => {
        this.logger.warn(
          err,
          `[agent:${agentId}] Subscriber resolution failed for action, continuing without subscriber`
        );

        return null;
      });

    const participantId = subscriberId ?? `${config.platform}:${userId}`;
    const participantType = subscriberId
      ? ConversationParticipantTypeEnum.SUBSCRIBER
      : ConversationParticipantTypeEnum.PLATFORM_USER;

    const conversation = await this.conversationService.createOrGetConversation({
      environmentId: config.environmentId,
      organizationId: config.organizationId,
      agentId,
      platform: config.platform,
      integrationId: config.integrationId,
      platformThreadId: thread.id,
      participantId,
      participantType,
      platformUserId: userId,
      firstMessageText: `[action:${action.id}]`,
    });

    const serializedThread = thread.toJSON() as unknown as Record<string, unknown>;
    await this.conversationService.updateChannelThread(
      config.environmentId,
      config.organizationId,
      conversation._id,
      thread.id,
      serializedThread
    );

    trackAgentInboundAction(this.analyticsService, {
      organizationId: config.organizationId,
      environmentId: config.environmentId,
      agentId,
      agentIdentifier: config.agentIdentifier,
      integrationIdentifier: config.integrationIdentifier,
      platform: config.platform,
      conversationId: conversation._id,
      actionId: action.id,
    });

    const [subscriber, history] = await Promise.all([
      subscriberId
        ? this.subscriberRepository.findBySubscriberId(config.environmentId, subscriberId)
        : Promise.resolve(null),
      this.conversationService.getHistory(config.environmentId, conversation._id),
    ]);

    await this.bridgeExecutor.execute({
      event: AgentEventEnum.ON_ACTION,
      config,
      conversation,
      subscriber,
      history,
      message: null,
      platformContext: {
        threadId: thread.id,
        channelId: thread.channelId,
        isDM: thread.isDM,
      },
      action,
    });
  }
}
