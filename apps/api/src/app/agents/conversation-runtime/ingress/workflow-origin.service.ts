import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import {
  ConversationActivityOriginData,
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
  buildWorkflowOriginLine,
  extractAgentEmailOriginToken,
  extractTelegramChatIdFromThreadId,
  extractTelegramQuotedMessageId,
  extractTeamsQuotedActivityId,
  extractWhatsAppQuotedWamid,
  isSendblueDirectThreadId,
  RECHECK_WORKFLOW_ORIGIN_PLATFORMS,
  resolvePlatformMessageId,
  toProviderMessageLookupKey,
  toWorkflowOriginSnapshot,
  WORKFLOW_ORIGIN_LOOKBACK_MS,
  type WorkflowOriginSnapshot,
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
   * Resolve the turn-scoped origin snapshot: hydrate when a new origin was found,
   * otherwise read the latest persisted row on an existing conversation.
   */
  async resolveForTurn(params: {
    agentId: string;
    config: ResolvedAgentConfig;
    conversation: ConversationEntity;
    platformThreadId: string;
    resolution: WorkflowOriginResolution | null;
    existingConversation: ConversationEntity | null;
  }): Promise<WorkflowOriginSnapshot | null> {
    const { agentId, config, conversation, platformThreadId, resolution, existingConversation } = params;

    if (resolution) {
      return this.hydrate({
        agentId,
        config,
        conversation,
        platformThreadId,
        origin: resolution.origin,
      });
    }

    if (!existingConversation || !this.canHoldWorkflowOrigin(config, existingConversation)) {
      return null;
    }

    const activity = await this.conversationService.findLatestWorkflowOrigin(config.environmentId, conversation._id);

    return toWorkflowOriginSnapshot(activity);
  }

  /**
   * Whether a persisted origin is even possible, so the read is skipped on the platforms and
   * conversations that can never hold one (`agent_chat`, `teams`, threads opened without a send).
   * `_notificationId` is stamped at create; recheck platforms can attach an origin later, without it.
   */
  private canHoldWorkflowOrigin(config: ResolvedAgentConfig, existingConversation: ConversationEntity): boolean {
    return Boolean(existingConversation._notificationId) || RECHECK_WORKFLOW_ORIGIN_PLATFORMS.has(config.platform);
  }

  /**
   * Persist the structured origin and return a `hydrated` snapshot. Prefer this return
   * value over a re-read so there is no read-after-write dependency on the hydration turn.
   */
  async hydrate(params: {
    agentId: string;
    config: ResolvedAgentConfig;
    conversation: ConversationEntity;
    platformThreadId: string;
    origin: MessageEntity;
  }): Promise<WorkflowOriginSnapshot | null> {
    const { agentId, config, conversation, platformThreadId, origin } = params;

    if (!origin._notificationId) {
      return null;
    }

    const platformMessageId = resolvePlatformMessageId(config.platform, origin, platformThreadId);
    if (!platformMessageId) {
      return null;
    }

    try {
      const { content, originData } = await this.buildWorkflowOriginContext(
        origin,
        conversation,
        config.environmentId,
        config.organizationId,
        platformMessageId
      );

      await this.conversationService.persistWorkflowOriginHydration({
        conversationId: conversation._id,
        channel: this.conversationService.getPrimaryChannel(conversation),
        agentIdentifier: config.agentIdentifier,
        environmentId: config.environmentId,
        organizationId: config.organizationId,
        platformMessageId,
        platformThreadId,
        content,
        originData,
      });

      return { content, data: originData, source: 'hydrated' };
    } catch (err) {
      captureAgentWarning(err, {
        component: 'workflow-origin-service',
        operation: 'hydrate-workflow-origin',
        agentId,
      });
      this.logger.warn(
        { err, agentId, platformThreadId, messageId: origin._id, notificationId: origin._notificationId },
        'Failed to hydrate workflow origin into conversation'
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
    organizationId: string,
    platformMessageId: string
  ): Promise<{
    content: string;
    originData: ConversationActivityOriginData;
  }> {
    const notification = await this.notificationRepository.findOne(
      {
        _id: originMessage._notificationId,
        _environmentId: environmentId,
        _organizationId: organizationId,
      },
      'payload'
    );

    /**
     * Stored verbatim: bridge handlers read `ctx.notification.payload` against the workflow's
     * payload schema, so reshaping it here would surface expected fields as `undefined`.
     */
    const payload =
      notification?.payload && typeof notification.payload === 'object' && !Array.isArray(notification.payload)
        ? (notification.payload as Record<string, unknown>)
        : {};

    const storedContent = typeof originMessage.content === 'string' ? originMessage.content.trim() : '';
    const workflowIdentifier = originMessage.templateIdentifier || 'unknown';
    const content = buildWorkflowOriginLine(workflowIdentifier, storedContent);

    const subscriberId = conversation.participants.find(
      (p) => p.type === ConversationParticipantTypeEnum.SUBSCRIBER
    )?.id;

    const originData: ConversationActivityOriginData = {
      notificationId: originMessage._notificationId!,
      templateId: originMessage._templateId,
      workflowIdentifier,
      messageId: originMessage._id,
      channel: originMessage.channel,
      platformMessageId,
      sentAt: originMessage.createdAt,
      payload,
      ...(originMessage._jobId ? { jobId: originMessage._jobId } : {}),
      ...(originMessage.stepId ? { stepId: originMessage.stepId } : {}),
      ...(originMessage.transactionId ? { transactionId: originMessage.transactionId } : {}),
      ...(subscriberId ? { subscriberId } : {}),
    };

    return { content, originData };
  }
}
