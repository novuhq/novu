import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import {
  ConversationEntity,
  ConversationParticipantTypeEnum,
  MessageEntity,
  MessageRepository,
  NotificationRepository,
  SubscriberRepository,
} from '@novu/dal';
import { ChannelTypeEnum, ENDPOINT_TYPES } from '@novu/shared';
import type { Message } from 'chat';
import { ResolvedAgentConfig } from '../../channels/agent-config-resolver.service';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import { captureAgentWarning } from '../../shared/errors/capture-agent-sentry';
import { AgentConversationService } from '../conversation/agent-conversation.service';
import {
  buildWorkflowOriginSummary,
  extractAgentEmailOriginToken,
  extractTeamsQuotedActivityId,
  extractTelegramChatIdFromThreadId,
  extractTelegramQuotedMessageId,
  extractWhatsAppQuotedWamid,
  isSendblueDirectThreadId,
  RECHECK_WORKFLOW_ORIGIN_PLATFORMS,
  resolvePlatformMessageId,
  toProviderMessageLookupKey,
  WORKFLOW_ORIGIN_LOOKBACK_MS,
} from './workflow-origin.helpers';

export interface WorkflowOriginResolution {
  origin: MessageEntity;
  /** Present only on conversation create — stamped onto createOrGetConversation. */
  notificationId?: string;
}

@Injectable()
export class WorkflowOriginService {
  constructor(
    private readonly logger: PinoLogger,
    private readonly conversationService: AgentConversationService,
    private readonly subscriberRepository: SubscriberRepository,
    private readonly notificationRepository: NotificationRepository,
    private readonly messageRepository: MessageRepository
  ) {}

  async resolve(params: {
    agentId: string;
    config: ResolvedAgentConfig;
    platformThreadId: string;
    subscriberId: string | null;
    message: Message | null;
    existingConversation: ConversationEntity | null;
    isDirectMessage?: boolean;
  }): Promise<WorkflowOriginResolution | null> {
    const { agentId, config, platformThreadId, subscriberId, message, existingConversation, isDirectMessage } = params;

    if (!subscriberId) {
      return null;
    }

    // Thread/token platforms bind origin at open; recheck platforms re-check later turns.
    if (existingConversation && !RECHECK_WORKFLOW_ORIGIN_PLATFORMS.has(config.platform)) {
      return null;
    }

    try {
      const subscriber = await this.subscriberRepository.findBySubscriberId(config.environmentId, subscriberId);
      if (!subscriber) {
        return null;
      }

      let origin: MessageEntity | null = null;

      switch (config.platform) {
        case AgentPlatformEnum.EMAIL:
          origin = message ? await this.findEmailWorkflowOriginMessage(agentId, config, subscriber._id, message) : null;
          break;
        case AgentPlatformEnum.WHATSAPP:
          origin = await this.findRecentChatWorkflowOriginMessage(
            agentId,
            config,
            subscriber._id,
            extractWhatsAppQuotedWamid(message)
          );
          break;
        case AgentPlatformEnum.TELEGRAM: {
          const chatId = extractTelegramChatIdFromThreadId(platformThreadId);
          if (chatId) {
            origin = await this.findRecentChatWorkflowOriginMessage(
              agentId,
              config,
              subscriber._id,
              extractTelegramQuotedMessageId(message),
              { 'channelData.endpoint.chatId': chatId }
            );
          }
          break;
        }
        case AgentPlatformEnum.SLACK: {
          const identifier = toProviderMessageLookupKey(platformThreadId);

          origin = await this.messageRepository.findOne({
            _environmentId: config.environmentId,
            _agentId: agentId,
            _subscriberId: subscriber._id,
            identifier,
          });
          break;
        }
        case AgentPlatformEnum.SENDBLUE:
          origin = isSendblueDirectThreadId(platformThreadId)
            ? await this.findRecentChatWorkflowOriginMessage(agentId, config, subscriber._id, null)
            : null;
          break;
        case AgentPlatformEnum.TEAMS:
          origin = isDirectMessage
            ? await this.findRecentChatWorkflowOriginMessage(
                agentId,
                config,
                subscriber._id,
                extractTeamsQuotedActivityId(message),
                { 'channelData.type': ENDPOINT_TYPES.MS_TEAMS_USER }
              )
            : null;
          break;
        case AgentPlatformEnum.AGENT_CHAT:
          break;
        default: {
          const _exhaustive: never = config.platform;
          void _exhaustive;

          return null;
        }
      }

      if (!origin) {
        return null;
      }

      // Conversation activity advances even when hydration failed, so only the hydration
      // marker can tell an attached origin from a lost one that still needs a retry.
      if (
        existingConversation &&
        (await this.isAlreadyHydrated(config, existingConversation._id, origin, platformThreadId))
      ) {
        return null;
      }

      return {
        origin,
        notificationId: existingConversation ? undefined : origin._notificationId,
      };
    } catch (err) {
      captureAgentWarning(err, {
        component: 'workflow-origin-service',
        operation: 'lookup-workflow-origin-message',
        agentId,
      });
      this.logger.warn(
        { err, agentId, platformThreadId },
        'Failed to look up workflow origin message for conversation hydration'
      );

      return null;
    }
  }

  /**
   * Returns the origin summary written to the transcript, or null when nothing was
   * hydrated. Runtimes that keep history server-side (managed) only ever receive the
   * new turn, so they need this value to see an origin attached mid-conversation.
   */
  async hydrate(params: {
    agentId: string;
    config: ResolvedAgentConfig;
    conversation: ConversationEntity;
    platformThreadId: string;
    origin: MessageEntity;
  }): Promise<string | null> {
    const { agentId, config, conversation, platformThreadId, origin } = params;

    if (!origin._notificationId) {
      return null;
    }

    const platformMessageId = resolvePlatformMessageId(config.platform, origin, platformThreadId);
    if (!platformMessageId) {
      return null;
    }

    try {
      const { messageContent, signalData } = await this.buildWorkflowOriginContext(
        origin,
        conversation,
        config.environmentId,
        config.organizationId
      );

      await this.conversationService.persistWorkflowOriginHydration({
        conversationId: conversation._id,
        channel: this.conversationService.getPrimaryChannel(conversation),
        agentIdentifier: config.agentIdentifier,
        environmentId: config.environmentId,
        organizationId: config.organizationId,
        platformMessageId,
        platformThreadId,
        messageContent,
        signalData,
      });

      return messageContent;
    } catch (err) {
      captureAgentWarning(err, {
        component: 'workflow-origin-service',
        operation: 'hydrate-workflow-origin',
        agentId,
      });
      this.logger.warn(
        { err, agentId, platformThreadId, messageId: origin._id, notificationId: origin._notificationId },
        'Failed to hydrate workflow origin into conversation history'
      );

      return null;
    }
  }

  private async findEmailWorkflowOriginMessage(
    agentId: string,
    config: ResolvedAgentConfig,
    subscriberId: string,
    message: Message
  ): Promise<MessageEntity | null> {
    const originId = extractAgentEmailOriginToken(message);
    if (!originId) {
      return null;
    }

    return this.messageRepository.findOne({
      _id: originId,
      _environmentId: config.environmentId,
      _agentId: agentId,
      _subscriberId: subscriberId,
    });
  }

  private async findRecentChatWorkflowOriginMessage(
    agentId: string,
    config: ResolvedAgentConfig,
    subscriberMongoId: string,
    quotedId: string | null,
    extraFilter: Record<string, unknown> = {}
  ): Promise<MessageEntity | null> {
    const base = {
      _environmentId: config.environmentId,
      _agentId: agentId,
      _subscriberId: subscriberMongoId,
      providerId: config.providerId,
      channel: ChannelTypeEnum.CHAT,
      _notificationId: { $exists: true, $ne: null },
      ...extraFilter,
    };

    if (quotedId) {
      return this.messageRepository.findOne({
        ...base,
        identifier: quotedId,
      });
    }

    const [origin] = await this.messageRepository.find(
      {
        ...base,
        identifier: { $exists: true, $nin: [null, ''] },
        createdAt: { $gt: new Date(Date.now() - WORKFLOW_ORIGIN_LOOKBACK_MS) },
      },
      '',
      {
        sort: { createdAt: -1 },
        limit: 1,
      }
    );

    return origin ?? null;
  }

  private async isAlreadyHydrated(
    config: ResolvedAgentConfig,
    conversationId: string,
    origin: MessageEntity,
    platformThreadId: string
  ): Promise<boolean> {
    const platformMessageId = resolvePlatformMessageId(config.platform, origin, platformThreadId);
    if (!platformMessageId) {
      return false;
    }

    return this.conversationService.isWorkflowOriginHydrated(config.environmentId, conversationId, platformMessageId);
  }

  private async buildWorkflowOriginContext(
    originMessage: MessageEntity,
    conversation: ConversationEntity,
    environmentId: string,
    organizationId: string
  ): Promise<{
    messageContent: string;
    signalData: Record<string, unknown>;
  }> {
    const notification = await this.notificationRepository.findOne(
      {
        _id: originMessage._notificationId,
        _environmentId: environmentId,
        _organizationId: organizationId,
      },
      'payload'
    );

    const payload =
      notification?.payload && typeof notification.payload === 'object' && !Array.isArray(notification.payload)
        ? (notification.payload as Record<string, unknown>)
        : {};

    const storedContent = typeof originMessage.content === 'string' ? originMessage.content.trim() : '';
    const workflowIdentifier = originMessage.templateIdentifier || 'unknown';
    const messageContent = buildWorkflowOriginSummary(workflowIdentifier, storedContent, payload);

    const subscriberId = conversation.participants.find(
      (p) => p.type === ConversationParticipantTypeEnum.SUBSCRIBER
    )?.id;

    return {
      messageContent,
      signalData: {
        notificationId: originMessage._notificationId,
        jobId: originMessage._jobId,
        messageId: originMessage._id,
        transactionId: originMessage.transactionId,
        workflowIdentifier,
        stepId: originMessage.stepId,
        subscriberId,
        payload,
      },
    };
  }
}
