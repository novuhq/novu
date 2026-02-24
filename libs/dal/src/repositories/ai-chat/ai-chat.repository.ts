import { AiResourceTypeEnum } from '@novu/shared';
import type { ClientSession } from 'mongoose';
import type { EnforceEnvOrOrgIds } from '../../types';
import { BaseRepository } from '../base-repository';
import { AiChatDBModel, AiChatEntity, AiChatSnapshotRef } from './ai-chat.entity';
import { AiChat } from './ai-chat.schema';

export class AiChatRepository extends BaseRepository<AiChatDBModel, AiChatEntity, EnforceEnvOrOrgIds> {
  constructor() {
    super(AiChat, AiChatEntity);
  }

  async findLatestByResource(
    environmentId: string,
    organizationId: string,
    userId: string,
    resourceType: AiResourceTypeEnum,
    resourceId: string
  ): Promise<AiChatEntity | null> {
    const results = await this.find(
      {
        _environmentId: environmentId,
        _organizationId: organizationId,
        _userId: userId,
        resourceType,
        resourceId,
      },
      undefined,
      { sort: { updatedAt: -1 }, limit: 1 }
    );

    return results[0] || null;
  }

  async pushSnapshotRef(
    environmentId: string,
    chatId: string,
    ref: AiChatSnapshotRef,
    options: { session?: ClientSession | null } = {}
  ): Promise<void> {
    await this.update({ _id: chatId, _environmentId: environmentId }, { $push: { snapshots: ref } } as any, options);
  }

  async pullSnapshotRef(
    environmentId: string,
    chatId: string,
    snapshotId: string,
    options: { session?: ClientSession | null } = {}
  ): Promise<void> {
    await this.update(
      { _id: chatId, _environmentId: environmentId },
      { $pull: { snapshots: { _snapshotId: snapshotId } } } as any,
      { session: options.session }
    );
  }

  async pullSnapshotRefs(
    environmentId: string,
    chatId: string,
    snapshotIds: string[],
    options: { session?: ClientSession | null } = {}
  ): Promise<void> {
    if (snapshotIds.length === 0) return;

    await this.update(
      { _id: chatId, _environmentId: environmentId },
      { $pull: { snapshots: { _snapshotId: { $in: snapshotIds } } } } as any,
      { session: options.session }
    );
  }

  async clearActiveStream(
    chatId: string,
    environmentId: string,
    organizationId: string,
    streamId: string
  ): Promise<void> {
    await this.update(
      {
        _id: chatId,
        _environmentId: environmentId,
        _organizationId: organizationId,
        activeStreamId: streamId,
      },
      { $set: { activeStreamId: null } }
    );
  }

  async clearActiveStreamForChat(chatId: string, environmentId: string, organizationId: string): Promise<void> {
    await this.update(
      {
        _id: chatId,
        _environmentId: environmentId,
        _organizationId: organizationId,
      },
      { $set: { activeStreamId: null } }
    );
  }
}
