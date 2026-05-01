import { Injectable } from '@nestjs/common';
import { DirectionEnum } from '@novu/shared';
import { FilterQuery } from 'mongoose';
import { EnforceEnvOrOrgIds } from '../../types';
import { SortOrder } from '../../types/sort-order';
import { BaseRepositoryV2 } from '../base-repository-v2';
import {
  ConversationDBModel,
  ConversationEntity,
  ConversationParticipant,
  ConversationParticipantTypeEnum,
  ConversationStatusEnum,
} from './conversation.entity';
import { Conversation } from './conversation.schema';

const LIST_CONVERSATIONS_SORT_FIELDS = ['_id', 'createdAt', 'lastActivityAt'] as const;
type ListConversationsSortField = (typeof LIST_CONVERSATIONS_SORT_FIELDS)[number];

function resolveListConversationsSortBy(sortBy?: string): ListConversationsSortField {
  if (sortBy && (LIST_CONVERSATIONS_SORT_FIELDS as readonly string[]).includes(sortBy)) {
    return sortBy as ListConversationsSortField;
  }

  return '_id';
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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

  /**
   * Refresh `lastActivityAt` and `lastMessagePreview` without incrementing `messageCount`.
   * Used for in-place message edits (replyHandle.edit) — the message count stays the same,
   * but the conversation's timeline and preview should reflect the latest content.
   */
  async touchPreview(environmentId: string, organizationId: string, id: string, messagePreview: string): Promise<void> {
    await this.update(
      { _id: id, _environmentId: environmentId, _organizationId: organizationId },
      {
        $set: {
          lastActivityAt: new Date().toISOString(),
          lastMessagePreview: messagePreview.slice(0, 200),
        },
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

  async listConversations({
    organizationId,
    environmentId,
    limit = 10,
    after,
    before,
    sortBy = '_id',
    sortDirection = 1,
    includeCursor = false,
    status,
    subscriberId,
    agentId,
    identifier,
    provider,
    createdAfter,
  }: {
    organizationId: string;
    environmentId: string;
    limit?: number;
    after?: string;
    before?: string;
    sortBy?: string;
    sortDirection?: SortOrder;
    includeCursor?: boolean;
    status?: ConversationStatusEnum;
    subscriberId?: string;
    agentId?: string;
    identifier?: string;
    provider?: string[];
    createdAfter?: string;
  }): Promise<{
    data: ConversationEntity[];
    next: string | null;
    previous: string | null;
    totalCount: number;
    totalCountCapped: boolean;
  }> {
    if (before && after) {
      throw new Error('Cannot specify both "before" and "after" cursors at the same time.');
    }

    const validatedSortBy = resolveListConversationsSortBy(sortBy);

    let conversation: ConversationEntity | null = null;
    const id = before || after;

    if (id) {
      conversation = await this.findOne(
        { _environmentId: environmentId, _organizationId: organizationId, _id: id },
        '*'
      );

      if (!conversation) {
        return { data: [], next: null, previous: null, totalCount: 0, totalCountCapped: false };
      }
    }

    const afterCursor =
      after && conversation ? { sortBy: conversation[validatedSortBy], paginateField: conversation._id } : undefined;
    const beforeCursor =
      before && conversation ? { sortBy: conversation[validatedSortBy], paginateField: conversation._id } : undefined;

    const query: FilterQuery<ConversationDBModel> & EnforceEnvOrOrgIds = {
      _environmentId: environmentId,
      _organizationId: organizationId,
    };

    if (status) {
      query.status = status;
    }

    if (subscriberId) {
      query.participants = {
        $elemMatch: { id: subscriberId, type: ConversationParticipantTypeEnum.SUBSCRIBER },
      };
    }

    if (agentId) {
      query._agentId = agentId;
    }

    const trimmedIdentifier = identifier?.trim();
    if (trimmedIdentifier) {
      query.identifier = new RegExp(escapeRegExp(trimmedIdentifier), 'i');
    }

    if (provider?.length) {
      query.channels = { $elemMatch: { platform: { $in: provider } } };
    }

    if (createdAfter) {
      query.createdAt = { $gte: new Date(createdAfter) };
    }

    return this.findWithCursorBasedPagination({
      after: afterCursor,
      before: beforeCursor,
      paginateField: '_id',
      limit,
      sortDirection: sortDirection === 1 ? DirectionEnum.ASC : DirectionEnum.DESC,
      sortBy: validatedSortBy,
      includeCursor,
      query,
      select: '*',
    });
  }
}
