import { Injectable } from '@nestjs/common';
import {
  ConversationActivityEntity,
  ConversationActivityRepository,
  ConversationActivitySenderTypeEnum,
  ConversationActivityTypeEnum,
  ConversationEntity,
  ConversationParticipantTypeEnum,
  ConversationRepository,
} from '@novu/dal';
import { Types } from 'mongoose';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import { ResolvedAgentConfig } from '../agent-config-resolver.service';
import type {
  WebConversationDto,
  WebConversationListResponseDto,
  WebConversationMessageDto,
  WebConversationMessagesResponseDto,
  WebMessagePartDto,
} from './dtos/web-chat.dto';
import { decodeWebThreadId, encodeWebThreadId } from './web-thread-id.util';

const HISTORY_ACTIVITY_TYPES = [
  ConversationActivityTypeEnum.MESSAGE,
  ConversationActivityTypeEnum.EDIT,
  ConversationActivityTypeEnum.TOOL_APPROVAL_REQUEST,
  ConversationActivityTypeEnum.TOOL_APPROVAL_DECISION,
];

const DEFAULT_PAGE_SIZE = 30;
const MAX_PAGE_SIZE = 100;

function clampLimit(limit?: number): number {
  if (!limit || !Number.isFinite(limit)) return DEFAULT_PAGE_SIZE;

  return Math.min(Math.max(Math.floor(limit), 1), MAX_PAGE_SIZE);
}

/**
 * Subscriber-scoped read model for web conversations. Ownership is structural:
 * the web platformThreadId embeds the subscriberId
 * (`web:<encodedSubscriberId>:<conversationId>`), so a subscriber can only
 * ever address threads minted for their own JWT identity — foreign
 * conversation ids resolve to a different thread id and return null (→ 404).
 */
@Injectable()
export class WebConversationReader {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly activityRepository: ConversationActivityRepository
  ) {}

  async listConversations(
    config: ResolvedAgentConfig,
    subscriberId: string,
    options: { limit?: number; before?: string }
  ): Promise<WebConversationListResponseDto> {
    const limit = clampLimit(options.limit);

    const conversations = await this.conversationRepository.find(
      {
        _environmentId: config.environmentId,
        _organizationId: config.organizationId,
        _agentId: config.agentId,
        channels: {
          $elemMatch: {
            platform: AgentPlatformEnum.WEB,
            _integrationId: new Types.ObjectId(config.integrationId),
          },
        },
        participants: {
          $elemMatch: { id: subscriberId, type: ConversationParticipantTypeEnum.SUBSCRIBER },
        },
        ...(options.before ? { lastActivityAt: { $lt: options.before } } : {}),
      },
      '*',
      { sort: { lastActivityAt: -1 }, limit: limit + 1 }
    );

    const hasMore = conversations.length > limit;
    const page = hasMore ? conversations.slice(0, limit) : conversations;

    return {
      data: page.flatMap((conversation) => {
        const dto = this.toConversationDto(conversation);

        return dto ? [dto] : [];
      }),
      hasMore,
    };
  }

  async getConversation(
    config: ResolvedAgentConfig,
    subscriberId: string,
    conversationId: string
  ): Promise<ConversationEntity | null> {
    const platformThreadId = encodeWebThreadId({ subscriberId, conversationId });

    return this.conversationRepository.findByPlatformThread(
      config.environmentId,
      config.organizationId,
      config.agentId,
      config.integrationId,
      platformThreadId
    );
  }

  async listMessages(
    config: ResolvedAgentConfig,
    conversation: ConversationEntity,
    options: { limit?: number; before?: string }
  ): Promise<WebConversationMessagesResponseDto> {
    const limit = clampLimit(options.limit);

    const activities = await this.activityRepository.find(
      {
        _environmentId: config.environmentId,
        _conversationId: conversation._id,
        type: { $in: HISTORY_ACTIVITY_TYPES },
        ...(options.before ? { createdAt: { $lt: options.before } } : {}),
      },
      '*',
      { sort: { createdAt: -1 }, limit: limit + 1 }
    );

    const hasMore = activities.length > limit;
    const page = hasMore ? activities.slice(0, limit) : activities;
    page.reverse();

    return { data: this.foldActivities(page), hasMore };
  }

  toConversationDto(conversation: ConversationEntity): WebConversationDto | null {
    const webChannel = conversation.channels.find((channel) => channel.platform === AgentPlatformEnum.WEB);
    const decoded = webChannel ? decodeWebThreadId(webChannel.platformThreadId) : null;

    if (!decoded) {
      return null;
    }

    return {
      id: decoded.conversationId,
      title: conversation.title,
      status: conversation.status,
      lastMessagePreview: conversation.lastMessagePreview,
      messageCount: conversation.messageCount,
      createdAt: conversation.createdAt,
      lastActivityAt: conversation.lastActivityAt,
    };
  }

  /**
   * Folds the raw activity log into the flat client message model:
   * - EDIT replaces the parts of its base message (matched by platformMessageId).
   * - TOOL_APPROVAL_REQUEST attaches a toolApproval part to the delivered card
   *   message (linked by platformMessageId) or stands alone when unlinked.
   * - TOOL_APPROVAL_DECISION resolves the matching part's status and is not
   *   emitted itself.
   * Pairs split across the pagination window fold best-effort.
   */
  private foldActivities(activities: ConversationActivityEntity[]): WebConversationMessageDto[] {
    const messages: WebConversationMessageDto[] = [];
    const byPlatformMessageId = new Map<string, WebConversationMessageDto>();
    const approvalParts = new Map<string, Extract<WebMessagePartDto, { type: 'toolApproval' }>>();

    for (const activity of activities) {
      switch (activity.type) {
        case ConversationActivityTypeEnum.MESSAGE: {
          const message = this.toMessageDto(activity);
          messages.push(message);
          if (activity.platformMessageId) {
            byPlatformMessageId.set(activity.platformMessageId, message);
          }
          break;
        }
        case ConversationActivityTypeEnum.EDIT: {
          const base = activity.platformMessageId ? byPlatformMessageId.get(activity.platformMessageId) : undefined;
          if (base) {
            base.parts = this.toParts(activity);
            base.isEdited = true;
          } else {
            // Base message is outside this page — surface the edit as a message
            // so its content is not lost.
            const message = this.toMessageDto(activity);
            message.isEdited = true;
            messages.push(message);
          }
          break;
        }
        case ConversationActivityTypeEnum.TOOL_APPROVAL_REQUEST: {
          const approvalId = activity.toolData?.approvalId;
          if (!approvalId) break;

          const part: Extract<WebMessagePartDto, { type: 'toolApproval' }> = {
            type: 'toolApproval',
            approvalId,
            toolCallId: activity.toolData?.toolCallId,
            toolName: activity.toolData?.toolName,
            input: activity.toolData?.input,
            status: 'pending',
          };
          approvalParts.set(approvalId, part);

          const cardMessage = activity.platformMessageId
            ? byPlatformMessageId.get(activity.platformMessageId)
            : undefined;
          if (cardMessage) {
            cardMessage.parts.push(part);
          } else {
            messages.push({
              id: activity.platformMessageId ?? activity.identifier,
              role: 'agent',
              parts: [...(activity.content ? [{ type: 'text', markdown: activity.content } as const] : []), part],
              senderName: activity.senderName,
              createdAt: activity.createdAt,
            });
          }
          break;
        }
        case ConversationActivityTypeEnum.TOOL_APPROVAL_DECISION: {
          const approvalId = activity.toolData?.approvalId;
          const part = approvalId ? approvalParts.get(approvalId) : undefined;
          if (part) {
            part.status = activity.toolData?.approved ? 'approved' : 'denied';
          }
          break;
        }
        default:
          break;
      }
    }

    return messages;
  }

  private toMessageDto(activity: ConversationActivityEntity): WebConversationMessageDto {
    return {
      id: activity.platformMessageId ?? activity.identifier,
      role:
        activity.senderType === ConversationActivitySenderTypeEnum.AGENT ||
        activity.senderType === ConversationActivitySenderTypeEnum.SYSTEM
          ? 'agent'
          : 'user',
      parts: this.toParts(activity),
      senderName: activity.senderName,
      createdAt: activity.createdAt,
    };
  }

  private toParts(activity: ConversationActivityEntity): WebMessagePartDto[] {
    const parts: WebMessagePartDto[] = [];
    const richContent = activity.richContent as { markdown?: unknown; card?: unknown; files?: unknown } | undefined;

    const markdown = typeof richContent?.markdown === 'string' ? richContent.markdown : undefined;
    const card =
      richContent?.card && typeof richContent.card === 'object'
        ? (richContent.card as Record<string, unknown>)
        : undefined;

    if (markdown !== undefined) {
      parts.push({ type: 'text', markdown });
    } else if (!card && activity.content) {
      parts.push({ type: 'text', markdown: activity.content });
    }

    if (card) {
      parts.push({ type: 'card', card });
    }

    if (Array.isArray(richContent?.files)) {
      for (const file of richContent.files) {
        if (!file || typeof file !== 'object') continue;
        const { url, filename, mimeType, size } = file as {
          url?: unknown;
          filename?: unknown;
          mimeType?: unknown;
          size?: unknown;
        };
        // URL-bearing refs only — inline base64 payloads are never exposed to the web client.
        if (typeof url !== 'string' || !url) continue;

        parts.push({
          type: 'file',
          url,
          ...(typeof filename === 'string' && { filename }),
          ...(typeof mimeType === 'string' && { mimeType }),
          ...(typeof size === 'number' && { size }),
        });
      }
    }

    return parts;
  }
}
