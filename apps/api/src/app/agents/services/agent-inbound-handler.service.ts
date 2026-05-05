import { Injectable } from '@nestjs/common';
import { AnalyticsService, PinoLogger } from '@novu/application-generic';
import {
  ConversationActivityEntity,
  ConversationActivitySenderTypeEnum,
  ConversationParticipantTypeEnum,
  SubscriberRepository,
} from '@novu/dal';
import type { AgentAction } from '@novu/framework';
import type { EmojiValue, Message, Thread } from 'chat';
import { trackAgentInboundAction, trackAgentInboundMessage, trackAgentInboundReaction } from '../agent-analytics';
import { AgentEventEnum } from '../dtos/agent-event.enum';
import { AgentPlatformEnum, PLATFORMS_WITH_TYPING_INDICATOR } from '../dtos/agent-platform.enum';
import { AgentAttachmentStorage, type StoredAttachment } from './agent-attachment-storage.service';
import { ResolvedAgentConfig } from './agent-config-resolver.service';
import { AgentConversationService, getInboundActivityPreview } from './agent-conversation.service';
import { AgentSubscriberResolver } from './agent-subscriber-resolver.service';
import { BridgeExecutorService, type BridgeReaction, NoBridgeUrlError } from './bridge-executor.service';

const ACKNOWLEDGE_FALLBACK_EMOJI = 'eyes' as const;

const ONBOARDING_NO_BRIDGE_REPLY_MARKDOWN = `*You're connected to Novu*

Your bot is linked successfully. Go back to the *Novu dashboard* to complete onboarding.`;

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
    private readonly subscriberRepository: SubscriberRepository,
    private readonly analyticsService: AnalyticsService,
    private readonly attachmentStorage: AgentAttachmentStorage
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

    try {
      await this.bridgeExecutor.execute({
        event,
        config,
        conversation,
        subscriber,
        history,
        message,
        platformContext: {
          threadId: platformThreadId,
          channelId: thread.channelId,
          isDM: thread.isDM,
        },
        storedAttachments: message.attachments?.length ? storedAttachments : undefined,
      });
    } catch (err) {
      if (err instanceof NoBridgeUrlError) {
        applyPlatformThreadIdToThread(thread, platformThreadId);
        const sent = await thread.post(ONBOARDING_NO_BRIDGE_REPLY_MARKDOWN);
        const channel = this.conversationService.getPrimaryChannel(conversation);
        await this.conversationService.persistAgentMessage({
          conversationId: conversation._id,
          channel,
          platformMessageId: (sent as { id?: string })?.id ?? '',
          agentIdentifier: config.agentIdentifier,
          content: ONBOARDING_NO_BRIDGE_REPLY_MARKDOWN,
          environmentId: config.environmentId,
          organizationId: config.organizationId,
        });

        return;
      }

      throw err;
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
      firstMessageText: `[action:${action.actionId}]`,
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
      actionId: action.actionId,
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
