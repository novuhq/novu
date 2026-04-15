import { Injectable } from '@nestjs/common';
import { EnforceEnvOrOrgIds } from '../../types';
import { BaseRepositoryV2 } from '../base-repository-v2';
import {
  ConversationActivityDBModel,
  ConversationActivityEntity,
  ConversationActivitySenderTypeEnum,
  ConversationActivitySignalData,
  ConversationActivityTypeEnum,
} from './conversation-activity.entity';
import { ConversationActivity } from './conversation-activity.schema';

@Injectable()
export class ConversationActivityRepository extends BaseRepositoryV2<
  ConversationActivityDBModel,
  ConversationActivityEntity,
  EnforceEnvOrOrgIds
> {
  constructor() {
    super(ConversationActivity, ConversationActivityEntity);
  }

  async findByConversation(
    environmentId: string,
    conversationId: string,
    limit = 20
  ): Promise<ConversationActivityEntity[]> {
    return this.find({ _environmentId: environmentId, _conversationId: conversationId }, '*', {
      sort: { createdAt: -1 },
      limit,
    });
  }

  async createUserActivity(params: {
    identifier: string;
    conversationId: string;
    platform: string;
    integrationId: string;
    platformThreadId: string;
    senderType: ConversationActivitySenderTypeEnum;
    senderId: string;
    content: string;
    platformMessageId?: string;
    senderName?: string;
    environmentId: string;
    organizationId: string;
  }): Promise<ConversationActivityEntity> {
    return this.create({
      identifier: params.identifier,
      _conversationId: params.conversationId,
      type: ConversationActivityTypeEnum.MESSAGE,
      platform: params.platform,
      _integrationId: params.integrationId,
      platformThreadId: params.platformThreadId,
      senderType: params.senderType,
      senderId: params.senderId,
      content: params.content,
      platformMessageId: params.platformMessageId,
      senderName: params.senderName,
      _environmentId: params.environmentId,
      _organizationId: params.organizationId,
    });
  }

  async createAgentActivity(params: {
    identifier: string;
    conversationId: string;
    platform: string;
    integrationId: string;
    platformThreadId: string;
    agentId: string;
    content: string;
    type?: ConversationActivityTypeEnum;
    senderName?: string;
    environmentId: string;
    organizationId: string;
  }): Promise<ConversationActivityEntity> {
    return this.create({
      identifier: params.identifier,
      _conversationId: params.conversationId,
      type: params.type ?? ConversationActivityTypeEnum.MESSAGE,
      platform: params.platform,
      _integrationId: params.integrationId,
      platformThreadId: params.platformThreadId,
      senderType: ConversationActivitySenderTypeEnum.AGENT,
      senderId: params.agentId,
      content: params.content,
      senderName: params.senderName,
      _environmentId: params.environmentId,
      _organizationId: params.organizationId,
    });
  }

  async findLastInboundMessage(
    environmentId: string,
    conversationId: string
  ): Promise<Pick<ConversationActivityEntity, '_id' | 'platformMessageId' | 'platformThreadId'> | null> {
    const results = await this.find(
      {
        _environmentId: environmentId,
        _conversationId: conversationId,
        type: ConversationActivityTypeEnum.MESSAGE,
        senderType: { $in: [ConversationActivitySenderTypeEnum.SUBSCRIBER, ConversationActivitySenderTypeEnum.PLATFORM_USER] },
      } as any,
      ['_id', 'platformMessageId', 'platformThreadId'],
      { sort: { createdAt: -1 }, limit: 1 }
    );

    return results[0] ?? null;
  }

  async createSignalActivity(params: {
    identifier: string;
    conversationId: string;
    platform: string;
    integrationId: string;
    platformThreadId: string;
    agentId: string;
    content: string;
    signalData: ConversationActivitySignalData;
    environmentId: string;
    organizationId: string;
  }): Promise<ConversationActivityEntity> {
    return this.create({
      identifier: params.identifier,
      _conversationId: params.conversationId,
      type: ConversationActivityTypeEnum.SIGNAL,
      platform: params.platform,
      _integrationId: params.integrationId,
      platformThreadId: params.platformThreadId,
      senderType: ConversationActivitySenderTypeEnum.SYSTEM,
      senderId: params.agentId,
      content: params.content,
      signalData: params.signalData,
      _environmentId: params.environmentId,
      _organizationId: params.organizationId,
    });
  }
}
