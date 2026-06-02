import { Injectable } from '@nestjs/common';
import { DirectionEnum } from '@novu/shared';
import { type ClientSession, FilterQuery, Types } from 'mongoose';
import { EnforceEnvOrOrgIds } from '../../types';
import { SortOrder } from '../../types/sort-order';
import { BaseRepositoryV2 } from '../base-repository-v2';
import {
  ConversationDBModel,
  ConversationEntity,
  ConversationParticipant,
  ConversationParticipantTypeEnum,
  ConversationStatusEnum,
  PendingManagedAgentSetup,
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

  /**
   * Resolves a conversation for an inbound platform thread. Must be scoped by
   * agent and integration so Telegram private-chat IDs (same numeric chat.id
   * across different bots) do not collide across agents in one environment.
   */
  async findByPlatformThread(
    environmentId: string,
    organizationId: string,
    agentId: string,
    integrationId: string,
    platformThreadId: string
  ): Promise<ConversationEntity | null> {
    return this.findOne(
      {
        _environmentId: environmentId,
        _organizationId: organizationId,
        _agentId: agentId,
        channels: {
          $elemMatch: {
            platformThreadId,
            _integrationId: new Types.ObjectId(integrationId),
          },
        },
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

  /**
   * Atomically set externalSessionId only if not already set.
   * Prevents race conditions when two concurrent first-messages
   * try to create sessions simultaneously.
   *
   * Optionally writes `managedSessionVaultId` in the same `$set` so the
   * vault binding always agrees with the session it was opened against —
   * a separate write could win the `externalSessionId` race but still
   * overwrite the vault id of the live session, defeating the rebind
   * check on the next turn.
   */
  async setExternalSessionIdIfMissing(
    environmentId: string,
    conversationId: string,
    sessionId: string,
    managedSessionVaultId?: string
  ): Promise<boolean> {
    const update: Record<string, string> = { externalSessionId: sessionId };

    if (managedSessionVaultId) {
      update.managedSessionVaultId = managedSessionVaultId;
    }

    const result = await this.update(
      {
        _id: conversationId,
        _environmentId: environmentId,
        externalSessionId: { $exists: false },
      },
      { $set: update }
    );

    return result.matched > 0;
  }

  async clearExternalSessionId(environmentId: string, conversationId: string): Promise<void> {
    await this.update(
      { _id: conversationId, _environmentId: environmentId },
      { $unset: { externalSessionId: '', managedSessionVaultId: '' } }
    );
  }

  async setPendingManagedAgentSetup(
    environmentId: string,
    organizationId: string,
    conversationId: string,
    value: PendingManagedAgentSetup
  ): Promise<void> {
    await this.update(
      { _id: conversationId, _environmentId: environmentId, _organizationId: organizationId },
      { $set: { pendingManagedAgentSetup: value } }
    );
  }

  async clearPendingManagedAgentSetup(
    environmentId: string,
    organizationId: string,
    conversationId: string
  ): Promise<void> {
    await this.update(
      { _id: conversationId, _environmentId: environmentId, _organizationId: organizationId },
      { $unset: { pendingManagedAgentSetup: '' } }
    );
  }

  async findWithPendingManagedAgentSetup(
    environmentId: string,
    organizationId: string,
    agentId: string,
    participantId: string,
    participantType = ConversationParticipantTypeEnum.SUBSCRIBER
  ): Promise<ConversationEntity[]> {
    return this.find(
      {
        _environmentId: environmentId,
        _organizationId: organizationId,
        _agentId: agentId,
        participants: { $elemMatch: { id: participantId, type: participantType } },
        pendingManagedAgentSetup: { $exists: true },
      },
      '*'
    );
  }

  async clearExternalSessionIdsForAgent(
    environmentId: string,
    organizationId: string,
    agentId: string,
    options?: { session?: ClientSession | null }
  ): Promise<void> {
    await this.update(
      {
        _agentId: agentId,
        _environmentId: environmentId,
        _organizationId: organizationId,
      },
      { $unset: { externalSessionId: '' } },
      options?.session ? { session: options.session } : {}
    );
  }

  async incrementTokenUsage(
    environmentId: string,
    organizationId: string,
    conversationId: string,
    delta: {
      inputTokens?: number;
      outputTokens?: number;
      cacheReadTokens?: number;
      cacheCreationTokens?: number;
      totalTokens?: number;
    }
  ): Promise<void> {
    const inc: Record<string, number> = {};

    if (delta.inputTokens) inc['tokenUsage.inputTokens'] = delta.inputTokens;
    if (delta.outputTokens) inc['tokenUsage.outputTokens'] = delta.outputTokens;
    if (delta.cacheReadTokens) inc['tokenUsage.cacheReadTokens'] = delta.cacheReadTokens;
    if (delta.cacheCreationTokens) inc['tokenUsage.cacheCreationTokens'] = delta.cacheCreationTokens;
    if (delta.totalTokens) inc['tokenUsage.totalTokens'] = delta.totalTokens;

    if (Object.keys(inc).length === 0) {
      return;
    }

    await this.update(
      { _id: conversationId, _environmentId: environmentId, _organizationId: organizationId },
      { $inc: inc }
    );
  }

  /**
   * Intentionally queries without _environmentId scope — session recovery and
   * edge callbacks only have the CF-generated session UUID and need to resolve
   * which environment owns it. Session IDs are system-generated UUIDs from
   * Cloudflare Durable Objects, not user-supplied input.
   */
  async findByExternalSessionId(sessionId: string) {
    return this.findOne({ externalSessionId: sessionId } as FilterQuery<ConversationDBModel> & EnforceEnvOrOrgIds, [
      '_id',
      '_agentId',
      '_environmentId',
      '_organizationId',
      'externalSessionId',
      'channels',
      // Needed by `ManagedAgentService.resolveSessionContext` to recover the
      // subscriber participant after a process restart so the Connect-card
      // OAuth path stays available on sessions that outlive the API instance.
      'participants',
    ]);
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
