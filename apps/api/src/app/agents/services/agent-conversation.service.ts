import { Injectable } from '@nestjs/common';
import { PinoLogger, shortId } from '@novu/application-generic';
import {
  ConversationActivityEntity,
  ConversationActivityRepository,
  ConversationActivitySenderTypeEnum,
  ConversationEntity,
  ConversationParticipantTypeEnum,
  ConversationRepository,
  ConversationStatusEnum,
} from '@novu/dal';

export interface CreateOrGetConversationParams {
  environmentId: string;
  organizationId: string;
  agentId: string;
  platform: string;
  integrationId: string;
  platformThreadId: string;
  participantId: string;
  participantType: ConversationParticipantTypeEnum;
  platformUserId: string;
  firstMessageText: string;
}

export interface PersistInboundMessageParams {
  conversationId: string;
  platform: string;
  integrationId: string;
  platformThreadId: string;
  senderType: ConversationActivitySenderTypeEnum;
  senderId: string;
  senderName?: string;
  content: string;
  richContent?: Record<string, unknown>;
  platformMessageId?: string;
  environmentId: string;
  organizationId: string;
}

@Injectable()
export class AgentConversationService {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly activityRepository: ConversationActivityRepository,
    private readonly logger: PinoLogger
  ) {}

  async createOrGetConversation(params: CreateOrGetConversationParams): Promise<ConversationEntity> {
    const { environmentId, organizationId, platformThreadId } = params;

    const existing = await this.conversationRepository.findByPlatformThread(
      environmentId,
      organizationId,
      platformThreadId
    );

    if (existing) {
      if (existing.status === ConversationStatusEnum.RESOLVED) {
        await this.conversationRepository.updateStatus(environmentId, organizationId, existing._id, ConversationStatusEnum.ACTIVE);
        existing.status = ConversationStatusEnum.ACTIVE;

        this.logger.debug(`Reopened resolved conversation ${existing._id} for thread ${platformThreadId}`);
      }

      await this.ensureParticipant(existing, params);

      return existing;
    }

    const conversation = await this.conversationRepository.create({
      identifier: `conv_${shortId(12)}`,
      _agentId: params.agentId,
      participants: [
        { type: params.participantType, id: params.participantId },
        { type: ConversationParticipantTypeEnum.AGENT, id: params.agentId },
      ],
      channels: [
        {
          platform: params.platform,
          _integrationId: params.integrationId,
          platformThreadId,
        },
      ],
      status: ConversationStatusEnum.ACTIVE,
      title: params.firstMessageText.slice(0, 200),
      metadata: {},
      _environmentId: environmentId,
      _organizationId: organizationId,
      lastActivityAt: new Date().toISOString(),
    });

    this.logger.debug(`Created conversation ${conversation._id} for thread ${platformThreadId}`);

    return conversation;
  }

  private async ensureParticipant(conversation: ConversationEntity, params: CreateOrGetConversationParams) {
    const alreadyPresent = conversation.participants.some(
      (p) => p.id === params.participantId && p.type === params.participantType
    );
    if (alreadyPresent) return;

    const platformIdentity = `${params.platform}:${params.platformUserId}`;

    if (params.participantType === ConversationParticipantTypeEnum.SUBSCRIBER) {
      const platformUserIdx = conversation.participants.findIndex(
        (p) => p.type === ConversationParticipantTypeEnum.PLATFORM_USER && p.id === platformIdentity
      );

      if (platformUserIdx !== -1) {
        conversation.participants[platformUserIdx] = { type: params.participantType, id: params.participantId };

        this.logger.debug(
          `Upgraded participant ${platformIdentity} → subscriber ${params.participantId} in conversation ${conversation._id}`
        );
      } else {
        conversation.participants.push({ type: params.participantType, id: params.participantId });
      }
    } else {
      conversation.participants.push({ type: params.participantType, id: params.participantId });
    }

    await this.conversationRepository.updateParticipants(
      params.environmentId,
      params.organizationId,
      conversation._id,
      conversation.participants
    );
  }

  async persistInboundMessage(params: PersistInboundMessageParams): Promise<ConversationActivityEntity> {
    const [activity] = await Promise.all([
      this.activityRepository.createUserActivity({
        identifier: `act_${shortId(12)}`,
        conversationId: params.conversationId,
        platform: params.platform,
        integrationId: params.integrationId,
        platformThreadId: params.platformThreadId,
        senderType: params.senderType,
        senderId: params.senderId,
        senderName: params.senderName,
        content: params.content,
        richContent: params.richContent,
        platformMessageId: params.platformMessageId,
        environmentId: params.environmentId,
        organizationId: params.organizationId,
      }),
      this.conversationRepository.touchActivity(params.environmentId, params.organizationId, params.conversationId, params.content),
    ]);

    return activity;
  }

  async getHistory(environmentId: string, conversationId: string, limit = 20): Promise<ConversationActivityEntity[]> {
    return this.activityRepository.findByConversation(environmentId, conversationId, limit);
  }

  async updateChannelThread(
    environmentId: string,
    organizationId: string,
    conversationId: string,
    platformThreadId: string,
    serializedThread: Record<string, unknown>
  ): Promise<void> {
    await this.conversationRepository.updateChannelThread(environmentId, organizationId, conversationId, platformThreadId, serializedThread);
  }
}
