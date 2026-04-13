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
    platformThreadId: string
  ): Promise<ConversationEntity | null> {
    return this.findOne(
      { _environmentId: environmentId, 'channels.platformThreadId': platformThreadId },
      '*'
    );
  }

  async findActiveByParticipant(
    environmentId: string,
    participantId: string,
    participantType = ConversationParticipantTypeEnum.SUBSCRIBER
  ): Promise<ConversationEntity[]> {
    return this.find(
      {
        _environmentId: environmentId,
        participants: { $elemMatch: { id: participantId, type: participantType } },
        status: ConversationStatusEnum.ACTIVE,
      },
      '*'
    );
  }

  async updateStatus(environmentId: string, id: string, status: ConversationStatusEnum): Promise<void> {
    await this.update({ _id: id, _environmentId: environmentId }, { $set: { status } });
  }

  async updateMetadata(environmentId: string, id: string, metadata: Record<string, unknown>): Promise<void> {
    await this.update({ _id: id, _environmentId: environmentId }, { $set: { metadata } });
  }

  async touchLastActivityAt(environmentId: string, id: string): Promise<void> {
    await this.update({ _id: id, _environmentId: environmentId }, { $set: { lastActivityAt: new Date().toISOString() } });
  }
}
