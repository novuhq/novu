import { Injectable } from '@nestjs/common';
import { EnforceEnvOrOrgIds } from '../../types';
import { BaseRepositoryV2 } from '../base-repository-v2';
import {
  ConversationDBModel,
  ConversationEntity,
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

  async updateStatus(environmentId: string, organizationId: string, id: string, status: ConversationStatusEnum): Promise<void> {
    await this.update(
      { _id: id, _environmentId: environmentId, _organizationId: organizationId },
      { $set: { status } }
    );
  }

  async updateMetadata(environmentId: string, organizationId: string, id: string, metadata: Record<string, unknown>): Promise<void> {
    await this.update(
      { _id: id, _environmentId: environmentId, _organizationId: organizationId },
      { $set: { metadata } }
    );
  }

  async touchLastActivityAt(environmentId: string, organizationId: string, id: string): Promise<void> {
    await this.update(
      { _id: id, _environmentId: environmentId, _organizationId: organizationId },
      { $set: { lastActivityAt: new Date().toISOString() } }
    );
  }
}
