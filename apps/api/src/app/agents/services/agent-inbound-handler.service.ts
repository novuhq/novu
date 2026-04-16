import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import {
  ConversationActivitySenderTypeEnum,
  ConversationParticipantTypeEnum,
  ConversationRepository,
  SubscriberRepository,
} from '@novu/dal';
import type { Message, Thread } from 'chat';
import { AgentEventEnum } from '../dtos/agent-event.enum';
import { HandleAgentReplyCommand } from '../usecases/handle-agent-reply/handle-agent-reply.command';
import { HandleAgentReply } from '../usecases/handle-agent-reply/handle-agent-reply.usecase';
import { ResolvedAgentConfig } from './agent-config-resolver.service';
import { AgentConversationService } from './agent-conversation.service';
import { AgentSubscriberResolver } from './agent-subscriber-resolver.service';
import {
  type BridgeAction,
  BridgeExecutorService,
  type BridgeReaction,
  NoBridgeUrlError,
} from './bridge-executor.service';

const ONBOARDING_NO_BRIDGE_REPLY_MARKDOWN = `*You're connected to Novu*

Your bot is linked successfully. Go back to the *Novu dashboard* to complete onboarding.`;

export interface InboundReactionEvent {
  emoji: { name: string };
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
    private readonly conversationRepository: ConversationRepository,
    private readonly bridgeExecutor: BridgeExecutorService,
    private readonly subscriberRepository: SubscriberRepository,
    @Inject(forwardRef(() => HandleAgentReply))
    private readonly handleAgentReply: HandleAgentReply
  ) {}

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

    const conversation = await this.conversationService.createOrGetConversation({
      environmentId: config.environmentId,
      organizationId: config.organizationId,
      agentId,
      platform: config.platform,
      integrationId: config.integrationId,
      platformThreadId: thread.id,
      participantId,
      participantType,
      platformUserId: message.author.userId,
      firstMessageText: message.text,
    });

    const senderType = subscriberId
      ? ConversationActivitySenderTypeEnum.SUBSCRIBER
      : ConversationActivitySenderTypeEnum.PLATFORM_USER;

    await this.conversationService.persistInboundMessage({
      conversationId: conversation._id,
      platform: config.platform,
      integrationId: config.integrationId,
      platformThreadId: thread.id,
      senderType,
      senderId: participantId,
      senderName: message.author.fullName,
      content: message.text,
      platformMessageId: message.id,
      environmentId: config.environmentId,
      organizationId: config.organizationId,
    });

    const channel = conversation.channels?.[0];
    const isFirstMessage = !channel?.firstPlatformMessageId;

    if (isFirstMessage && config.reactionOnMessageReceived && message.id) {
      thread
        .createSentMessageFromMessage(message)
        .addReaction(config.reactionOnMessageReceived)
        .catch((err) => {
          this.logger.warn(err, `[agent:${agentId}] Failed to add ack reaction to first message`);
        });

      this.conversationRepository
        .setFirstPlatformMessageId(config.environmentId, config.organizationId, conversation._id, thread.id, message.id)
        .catch((err) => {
          this.logger.warn(err, `[agent:${agentId}] Failed to store firstPlatformMessageId`);
        });
    }

    if (config.thinkingIndicatorEnabled) {
      await thread.startTyping('Thinking...');
    }

    const serializedThread = thread.toJSON() as unknown as Record<string, unknown>;
    await this.conversationService.updateChannelThread(
      config.environmentId,
      config.organizationId,
      conversation._id,
      thread.id,
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
          threadId: thread.id,
          channelId: thread.channelId,
          isDM: thread.isDM,
        },
      });
    } catch (err) {
      if (err instanceof NoBridgeUrlError) {
        await this.handleAgentReply.execute(
          HandleAgentReplyCommand.create({
            userId: 'system',
            environmentId: config.environmentId,
            organizationId: config.organizationId,
            conversationId: conversation._id,
            agentIdentifier: agentId,
            integrationIdentifier: config.integrationIdentifier,
            reply: { text: ONBOARDING_NO_BRIDGE_REPLY_MARKDOWN },
          })
        );

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

    const conversation = await this.conversationRepository.findByPlatformThread(
      config.environmentId,
      config.organizationId,
      threadId
    );

    if (!conversation) {
      return;
    }

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

    const reaction: BridgeReaction = {
      emoji: event.emoji.name,
      added: event.added,
      messageId: event.messageId,
      sourceMessage: event.message,
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
      reaction,
    });
  }

  async handleAction(
    agentId: string,
    config: ResolvedAgentConfig,
    thread: Thread,
    action: BridgeAction,
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
