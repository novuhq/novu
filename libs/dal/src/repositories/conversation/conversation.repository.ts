import { Injectable } from '@nestjs/common';
import { EnforceEnvOrOrgIds } from '../../types';
import { BaseRepositoryV2 } from '../base-repository-v2';
import {
  ConversationDBModel,
  ConversationEntity,
  ConversationParticipant,
  ConversationParticipantTypeEnum,
  ConversationStatusEnum,
} from './conversation.entity';
import { Conversation } from './conversation.schema';

@Injectable()
export class ConversationRepository extends BaseRepositoryV2<
  ConversationDBModel,
  ConversationEntity,
  EnforceEnvOrOrgIds
> {
  constructor() {
    super(Conversation, ConversationEntity);
  }

  async findByPlatformThread(
    environmentId: string,
    organizationId: string,
    platformThreadId: string
  ): Promise<ConversationEntity | null> {
    return this.findOne(
      {
        _environmentId: environmentId,
        _organizationId: organizationId,
        'channels.platformThreadId': platformThreadId,
      },
      '*'
    );
  }

  async findActiveByParticipant(
    environmentId: string,
    organizationId: string,
    participantId: string,
    participantType = ConversationParticipantTypeEnum.SUBSCRIBER
  ): Promise<ConversationEntity[]> {
    return this.find(
      {
        _environmentId: environmentId,
        _organizationId: organizationId,
        participants: { $elemMatch: { id: participantId, type: participantType } },
        status: ConversationStatusEnum.ACTIVE,
      },
      '*'
    );
  }

  async updateStatus(
    environmentId: string,
    organizationId: string,
    id: string,
    status: ConversationStatusEnum
  ): Promise<void> {
    await this.update(
      { _id: id, _environmentId: environmentId, _organizationId: organizationId },
      { $set: { status } }
    );
  }

  async updateMetadata(
    environmentId: string,
    organizationId: string,
    id: string,
    metadata: Record<string, unknown>
  ): Promise<void> {
    await this.update(
      { _id: id, _environmentId: environmentId, _organizationId: organizationId },
      { $set: { metadata } }
    );
  }

  async updateParticipants(
    environmentId: string,
    organizationId: string,
    id: string,
    participants: ConversationParticipant[]
  ): Promise<void> {
    await this.update(
      { _id: id, _environmentId: environmentId, _organizationId: organizationId },
      { $set: { participants } }
    );
  }

  async touchActivity(
    environmentId: string,
    organizationId: string,
    id: string,
    messagePreview: string
  ): Promise<void> {
    await this.update(
      { _id: id, _environmentId: environmentId, _organizationId: organizationId },
      {
        $set: {
          lastActivityAt: new Date().toISOString(),
          lastMessagePreview: messagePreview.slice(0, 200),
        },
        $inc: { messageCount: 1 },
      }
    );
  }

  async updateChannelThread(
    environmentId: string,
    organizationId: string,
    id: string,
    platformThreadId: string,
    serializedThread: Record<string, unknown>
  ): Promise<void> {
    await this.update(
      {
        _id: id,
        _environmentId: environmentId,
        _organizationId: organizationId,
        'channels.platformThreadId': platformThreadId,
      },
      { $set: { 'channels.$.serializedThread': serializedThread } }
    );
  }

  async setFirstPlatformMessageId(
    environmentId: string,
    organizationId: string,
    id: string,
    platformThreadId: string,
    firstPlatformMessageId: string
  ): Promise<void> {
    await this.update(
      {
        _id: id,
        _environmentId: environmentId,
        _organizationId: organizationId,
        channels: {
          $elemMatch: {
            platformThreadId,
            firstPlatformMessageId: { $exists: false },
          },
        },
      },
      { $set: { 'channels.$.firstPlatformMessageId': firstPlatformMessageId } }
    );
  }
}
