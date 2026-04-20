import { Injectable } from '@nestjs/common';
import { DirectionEnum } from '@novu/shared';
import { FilterQuery } from 'mongoose';
import { EnforceEnvOrOrgIds } from '../../types';
import { SortOrder } from '../../types/sort-order';
import { BaseRepositoryV2 } from '../base-repository-v2';
import {
  ConversationActivityDBModel,
  ConversationActivityEntity,
  ConversationActivitySenderTypeEnum,
  ConversationActivitySignalData,
  ConversationActivityTypeEnum,
} from './conversation-activity.entity';
import { ConversationActivity } from './conversation-activity.schema';

const LIST_ACTIVITIES_SORT_FIELDS = ['_id', 'createdAt'] as const;
type ListActivitiesSortField = (typeof LIST_ACTIVITIES_SORT_FIELDS)[number];

function resolveListActivitiesSortBy(sortBy?: string): ListActivitiesSortField {
  if (sortBy && (LIST_ACTIVITIES_SORT_FIELDS as readonly string[]).includes(sortBy)) {
    return sortBy as ListActivitiesSortField;
  }

  return 'createdAt';
}

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
    richContent?: Record<string, unknown>;
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
      richContent: params.richContent,
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
    richContent?: Record<string, unknown>;
    type?: ConversationActivityTypeEnum;
    senderName?: string;
    platformMessageId?: string;
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
      richContent: params.richContent,
      senderName: params.senderName,
      platformMessageId: params.platformMessageId,
      _environmentId: params.environmentId,
      _organizationId: params.organizationId,
    });
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

  async listActivities({
    organizationId,
    environmentId,
    conversationId,
    limit = 20,
    after,
    before,
    sortBy = 'createdAt',
    sortDirection = 1,
    includeCursor = false,
  }: {
    organizationId: string;
    environmentId: string;
    conversationId: string;
    limit?: number;
    after?: string;
    before?: string;
    sortBy?: string;
    sortDirection?: SortOrder;
    includeCursor?: boolean;
  }): Promise<{
    data: ConversationActivityEntity[];
    next: string | null;
    previous: string | null;
    totalCount: number;
    totalCountCapped: boolean;
  }> {
    if (before && after) {
      throw new Error('Cannot specify both "before" and "after" cursors at the same time.');
    }

    const validatedSortBy = resolveListActivitiesSortBy(sortBy);

    let activity: ConversationActivityEntity | null = null;
    const id = before || after;

    if (id) {
      activity = await this.findOne(
        {
          _environmentId: environmentId,
          _organizationId: organizationId,
          _conversationId: conversationId,
          _id: id,
        },
        '*'
      );

      if (!activity) {
        return { data: [], next: null, previous: null, totalCount: 0, totalCountCapped: false };
      }
    }

    const afterCursor =
      after && activity ? { sortBy: activity[validatedSortBy], paginateField: activity._id } : undefined;
    const beforeCursor =
      before && activity ? { sortBy: activity[validatedSortBy], paginateField: activity._id } : undefined;

    const query: FilterQuery<ConversationActivityDBModel> & EnforceEnvOrOrgIds = {
      _environmentId: environmentId,
      _organizationId: organizationId,
      _conversationId: conversationId,
    };

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
