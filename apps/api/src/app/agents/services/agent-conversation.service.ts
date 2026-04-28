import { BadRequestException, Injectable } from '@nestjs/common';
import { PinoLogger, shortId } from '@novu/application-generic';
import {
  ConversationActivityEntity,
  ConversationActivityRepository,
  ConversationActivitySenderTypeEnum,
  ConversationActivityTypeEnum,
  ConversationChannel,
  ConversationEntity,
  ConversationParticipantTypeEnum,
  ConversationRepository,
  ConversationStatusEnum,
} from '@novu/dal';
import type { TriggerRecipientsPayload } from '@novu/shared';

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

export interface ConversationActivityContext {
  conversationId: string;
  channel: ConversationChannel;
  agentIdentifier: string;
  environmentId: string;
  organizationId: string;
}

export interface PersistAgentActivityParams extends ConversationActivityContext {
  platformMessageId: string;
  /** Overrides channel.platformThreadId when delivery returns a different thread ID */
  platformThreadId?: string;
  agentName?: string;
  content: string;
  richContent?: Record<string, unknown>;
}

export interface UpdateMetadataParams extends ConversationActivityContext {
  currentMetadata: Record<string, unknown>;
  signals: Array<{ key: string; value: unknown }>;
}

export interface ResolveConversationParams extends ConversationActivityContext {
  summary?: string;
}

export interface PersistTriggerSignalParams extends ConversationActivityContext {
  workflowId: string;
  to: TriggerRecipientsPayload;
  transactionId: string;
}

@Injectable()
export class AgentConversationService {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly activityRepository: ConversationActivityRepository,
    private readonly logger: PinoLogger
  ) {}

  getPrimaryChannel(conversation: ConversationEntity): ConversationChannel {
    const channel = conversation.channels?.[0];
    if (!channel) {
      throw new BadRequestException(`Conversation ${conversation._id} has no channel`);
    }

    return channel;
  }

  async createOrGetConversation(params: CreateOrGetConversationParams): Promise<ConversationEntity> {
    const { environmentId, organizationId, platformThreadId } = params;
    const existing = await this.conversationRepository.findByPlatformThread(
      environmentId,
      organizationId,
      platformThreadId
    );

    if (existing) {
      if (existing.status === ConversationStatusEnum.RESOLVED) {
        await this.conversationRepository.updateStatus(
          environmentId,
          organizationId,
          existing._id,
          ConversationStatusEnum.ACTIVE
        );
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
      this.conversationRepository.touchActivity(
        params.environmentId,
        params.organizationId,
        params.conversationId,
        params.content
      ),
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
    await this.conversationRepository.updateChannelThread(
      environmentId,
      organizationId,
      conversationId,
      platformThreadId,
      serializedThread
    );
  }

  async getConversation(
    conversationId: string,
    environmentId: string,
    organizationId: string
  ): Promise<ConversationEntity | null> {
    return this.conversationRepository.findOne(
      { _id: conversationId, _environmentId: environmentId, _organizationId: organizationId },
      '*'
    );
  }

  async findByPlatformThread(
    environmentId: string,
    organizationId: string,
    platformThreadId: string
  ): Promise<ConversationEntity | null> {
    return this.conversationRepository.findByPlatformThread(environmentId, organizationId, platformThreadId);
  }

  async setFirstPlatformMessageId(
    environmentId: string,
    organizationId: string,
    conversationId: string,
    platformThreadId: string,
    messageId: string
  ): Promise<void> {
    await this.conversationRepository.setFirstPlatformMessageId(
      environmentId,
      organizationId,
      conversationId,
      platformThreadId,
      messageId
    );
  }

  async persistAgentMessage(params: PersistAgentActivityParams): Promise<ConversationActivityEntity> {
    return this.persistAgentActivity(params, ConversationActivityTypeEnum.MESSAGE, 'activity');
  }

  async persistAgentEdit(params: PersistAgentActivityParams): Promise<ConversationActivityEntity> {
    return this.persistAgentActivity(params, ConversationActivityTypeEnum.EDIT, 'preview');
  }

  private async persistAgentActivity(
    params: PersistAgentActivityParams,
    type: ConversationActivityTypeEnum,
    touch: 'activity' | 'preview'
  ): Promise<ConversationActivityEntity> {
    const threadId = params.platformThreadId ?? params.channel.platformThreadId;

    const touchFn =
      touch === 'activity'
        ? this.conversationRepository.touchActivity.bind(this.conversationRepository)
        : this.conversationRepository.touchPreview.bind(this.conversationRepository);

    const [activity] = await Promise.all([
      this.activityRepository.createAgentActivity({
        identifier: `act_${shortId(12)}`,
        conversationId: params.conversationId,
        platform: params.channel.platform,
        integrationId: params.channel._integrationId,
        platformThreadId: threadId,
        platformMessageId: params.platformMessageId,
        agentId: params.agentIdentifier,
        senderName: params.agentName,
        content: params.content,
        richContent: params.richContent,
        type,
        environmentId: params.environmentId,
        organizationId: params.organizationId,
      }),
      touchFn(params.environmentId, params.organizationId, params.conversationId, params.content),
    ]);

    return activity;
  }

  async updateMetadata(params: UpdateMetadataParams): Promise<void> {
    const merged: Record<string, unknown> = { ...(params.currentMetadata ?? {}) };
    for (const signal of params.signals) {
      merged[signal.key] = signal.value;
    }

    const serialized = JSON.stringify(merged);
    if (Buffer.byteLength(serialized) > 65_536) {
      throw new BadRequestException('Conversation metadata exceeds 64KB limit');
    }

    await Promise.all([
      this.conversationRepository.updateMetadata(
        params.environmentId,
        params.organizationId,
        params.conversationId,
        merged
      ),
      this.activityRepository.createSignalActivity({
        identifier: `act_${shortId(12)}`,
        conversationId: params.conversationId,
        platform: params.channel.platform,
        integrationId: params.channel._integrationId,
        platformThreadId: params.channel.platformThreadId,
        agentId: params.agentIdentifier,
        content: `Metadata updated: ${params.signals.map((s) => s.key).join(', ')}`,
        signalData: { type: 'metadata', payload: merged },
        environmentId: params.environmentId,
        organizationId: params.organizationId,
      }),
    ]);
  }

  async resolveConversation(params: ResolveConversationParams): Promise<void> {
    await Promise.all([
      this.conversationRepository.updateStatus(
        params.environmentId,
        params.organizationId,
        params.conversationId,
        ConversationStatusEnum.RESOLVED
      ),
      this.activityRepository.createSignalActivity({
        identifier: `act_${shortId(12)}`,
        conversationId: params.conversationId,
        platform: params.channel.platform,
        integrationId: params.channel._integrationId,
        platformThreadId: params.channel.platformThreadId,
        agentId: params.agentIdentifier,
        content: params.summary ?? 'Conversation resolved',
        signalData: { type: 'resolve', payload: params.summary ? { summary: params.summary } : undefined },
        environmentId: params.environmentId,
        organizationId: params.organizationId,
      }),
    ]);
  }

  async persistTriggerSignal(params: PersistTriggerSignalParams): Promise<void> {
    await this.activityRepository.createSignalActivity({
      identifier: `act_${shortId(12)}`,
      conversationId: params.conversationId,
      platform: params.channel.platform,
      integrationId: params.channel._integrationId,
      platformThreadId: params.channel.platformThreadId,
      agentId: params.agentIdentifier,
      content: `Triggered workflow: ${params.workflowId}`,
      signalData: {
        type: 'trigger',
        payload: {
          workflowId: params.workflowId,
          to: params.to,
          transactionId: params.transactionId,
        },
      },
      environmentId: params.environmentId,
      organizationId: params.organizationId,
    });
  }
}
