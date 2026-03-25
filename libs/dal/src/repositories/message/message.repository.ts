import {
  ActorTypeEnum,
  ButtonTypeEnum,
  buildTagsQuery,
  ChannelTypeEnum,
  MessageActionStatusEnum,
  MessagesStatusEnum,
  SeverityLevelEnum,
  type TagsMongoFragment,
} from '@novu/shared';
import { FilterQuery, ProjectionType, Types } from 'mongoose';

import { DalException } from '../../shared';
import { EnforceEnvId } from '../../types/enforce';
import { BaseRepository } from '../base-repository';
import { FeedRepository } from '../feed';
import { MessageDBModel, MessageEntity } from './message.entity';
import { Message } from './message.schema';

type MessageQuery = FilterQuery<MessageDBModel>;

const MAX_PAYLOAD_QUERY_DEPTH = 3;

const DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype'];

const isValidKey = (key: string): boolean => {
  // Reject keys starting with '$' or '.' to prevent MongoDB operator injection.
  if (key.startsWith('$') || key.startsWith('.')) {
    return false;
  }

  // Reject known prototype pollution vectors.
  if (DANGEROUS_KEYS.includes(key)) {
    return false;
  }

  return true;
};

const getEntries = (obj: object, prefix = '', currentDepth = 0, maxDepth: number): [string, any][] =>
  Object.entries(obj).flatMap(([key, value]) => {
    // Sanitize the key before using it.
    if (!isValidKey(key)) {
      // Skip this entry if the key is invalid to prevent pollution or injection.
      return [];
    }

    const newKeySegment = prefix ? `${prefix}.${key}` : key;

    if (currentDepth < maxDepth && typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return getEntries(value, newKeySegment, currentDepth + 1, maxDepth);
    } else {
      return [[newKeySegment, value]];
    }
  });

const getFlatObject = (obj: object) => {
  return Object.fromEntries(getEntries(obj, '', 0, MAX_PAYLOAD_QUERY_DEPTH));
};

function mergeTagsMongoFragment<MessageQueryT extends MessageQuery & EnforceEnvId>(
  query: MessageQueryT,
  fragment: TagsMongoFragment
): MessageQueryT {
  if (!fragment || Object.keys(fragment).length === 0) {
    return query;
  }

  if ('tags' in fragment && fragment.tags) {
    return { ...query, tags: fragment.tags };
  }

  if ('$and' in fragment && fragment.$and) {
    return {
      ...query,
      $and: [...(query.$and ?? []), ...fragment.$and],
    };
  }

  return query;
}

export class MessageRepository extends BaseRepository<MessageDBModel, MessageEntity, EnforceEnvId> {
  private static readonly BATCH_SIZE = 100;
  private feedRepository = new FeedRepository();
  constructor() {
    super(Message, MessageEntity);
  }

  private chunkArray<T>(array: T[], size: number = MessageRepository.BATCH_SIZE): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }

    return chunks;
  }

  async findOne(
    query: FilterQuery<MessageDBModel> & EnforceEnvId,
    select?: ProjectionType<MessageEntity>,
    options: {
      readPreference?: 'secondaryPreferred' | 'primary';
      query?: any;
      session?: any;
    } = {}
  ): Promise<MessageEntity | null> {
    const transformedQuery = this.transformContextKeysQuery(query) as FilterQuery<MessageDBModel> & EnforceEnvId;

    return super.findOne(transformedQuery, select, options);
  }

  async findOneForInbox(
    query: FilterQuery<MessageDBModel> & EnforceEnvId,
    select?: ProjectionType<MessageEntity>,
    options: {
      readPreference?: 'secondaryPreferred' | 'primary';
      query?: any;
      session?: any;
    } = {}
  ): Promise<MessageEntity | null> {
    const transformedQuery = this.transformContextKeysQuery(query) as FilterQuery<MessageDBModel> & EnforceEnvId;

    return super.findOne(transformedQuery, select, {
      ...options,
      enhanceQuery: (queryBuilder) =>
        queryBuilder.populate('subscriber', '_id firstName lastName avatar subscriberId').populate({
          path: 'template',
          select: '_id name tags data critical triggers severity',
          options: {
            withDeleted: true,
          },
        }),
    });
  }

  private async getFilterQueryForMessage(
    environmentId: string,
    subscriberId: string,
    channel: ChannelTypeEnum,
    query: {
      feedId?: string[];
      /** Normalized CNF: AND of OR-groups; omit or empty = no tag filter */
      tagGroups?: string[][];
      seen?: boolean;
      read?: boolean;
      archived?: boolean;
      snoozed?: boolean;
      payload?: object;
      data?: Record<string, unknown>;
      severity?: SeverityLevelEnum[];
    } = {},
    contextKeys?: string[],
    createdAt?: {
      $gte: Date;
    }
  ): Promise<MessageQuery & EnforceEnvId> {
    let requestQuery: MessageQuery & EnforceEnvId = {
      _environmentId: environmentId,
      _subscriberId: subscriberId,
      channel,
      deleted: { $exists: false },
    };

    if (query.feedId === null) {
      requestQuery._feedId = { $eq: null };
    }

    if (query.feedId) {
      const feeds = await this.feedRepository.find(
        {
          _environmentId: environmentId,
          identifier: {
            $in: query.feedId,
          },
        },
        '_id'
      );
      requestQuery._feedId = {
        $in: feeds.map((feed) => feed._id),
      };
    }

    if (query.seen != null) {
      requestQuery.seen = query.seen;
    } else {
      requestQuery.seen = { $in: [true, false] };
    }

    if (query.read != null) {
      requestQuery.read = query.read;
    } else {
      requestQuery.read = { $in: [true, false] };
    }

    if (query.tagGroups && query.tagGroups.length > 0) {
      requestQuery = mergeTagsMongoFragment(requestQuery, buildTagsQuery(query.tagGroups));
    }

    if (query.archived != null) {
      requestQuery.archived = query.archived;
    } else {
      requestQuery.archived = { $in: [true, false] };
    }

    const snoozedCondition: Array<MessageQuery> = [];
    if (query.snoozed != null) {
      if (query.snoozed) {
        requestQuery.snoozedUntil = { $ne: null };
      } else {
        snoozedCondition.push({ snoozedUntil: { $exists: false } }, { snoozedUntil: null });
      }
    }

    const severityCondition: Array<MessageQuery> = [];
    if (query.severity && query.severity?.length > 0) {
      if (query.severity.includes(SeverityLevelEnum.NONE)) {
        severityCondition.push({ severity: { $exists: false } }, { severity: { $in: query.severity } });
      } else {
        requestQuery.severity = { $in: query.severity };
      }
    }

    if (contextKeys !== undefined) {
      const contextQuery = this.buildContextExactMatchQuery(contextKeys);
      requestQuery.$and = [...(requestQuery.$and ?? []), contextQuery];
    }

    if (createdAt != null) {
      requestQuery.createdAt = createdAt;
    }

    // combine all $or conditions properly
    const orConditions: Array<MessageQuery> = [];
    if (severityCondition.length > 0) {
      orConditions.push({ $or: severityCondition });
    }
    if (snoozedCondition.length > 0) {
      orConditions.push({ $or: snoozedCondition });
    }

    if (orConditions.length > 0) {
      requestQuery.$and = [...(requestQuery.$and ?? []), ...orConditions];
    }

    if (query.payload) {
      requestQuery = {
        ...getFlatObject({ payload: query.payload }),
        ...requestQuery,
      };
    }

    if (query.data) {
      requestQuery = {
        ...getFlatObject({ data: query.data }),
        ...requestQuery,
      };
    }

    return requestQuery;
  }

  /**
   * if aggregation is needed, make sure to filter with {deleted: { $ne: true }}.
   * todo: aggregate method should be implemented after all the soft deletes are removed task nv-5688
   */
  async aggregate(query: any[], options: { readPreference?: 'secondaryPreferred' | 'primary' } = {}): Promise<any> {
    throw new Error('Not implemented');
  }

  async findBySubscriberChannel(
    environmentId: string,
    subscriberId: string,
    channel: ChannelTypeEnum,
    query: { feedId?: string[]; seen?: boolean; read?: boolean; payload?: object } = {},
    options: { limit: number; skip?: number } = { limit: 10 }
  ) {
    const requestQuery = await this.getFilterQueryForMessage(environmentId, subscriberId, channel, query);

    const messages = await this.MongooseModel.find(requestQuery, '', {
      limit: options.limit,
      skip: options.skip,
      sort: '-createdAt',
    })
      .read('secondaryPreferred')
      .populate('template', '_id tags')
      .populate('subscriber', '_id firstName lastName avatar subscriberId')
      .populate('actorSubscriber', '_id firstName lastName avatar subscriberId');

    return this.mapEntities(messages);
  }

  async paginate(
    {
      environmentId,
      channel,
      subscriberId,
      tagGroups,
      read,
      archived,
      snoozed,
      seen,
      data,
      severity: severityArray,
      contextKeys,
      createdGte,
      createdLte,
    }: {
      environmentId: string;
      subscriberId: string;
      channel: ChannelTypeEnum;
      tagGroups?: string[][];
      read?: boolean;
      archived?: boolean;
      snoozed?: boolean;
      seen?: boolean;
      data?: Record<string, unknown>;
      severity?: SeverityLevelEnum[];
      contextKeys?: string[];
      createdGte?: Date;
      createdLte?: Date;
    },
    options: { limit: number; offset: number; after?: string }
  ) {
    let query: MessageQuery & EnforceEnvId = {
      _environmentId: environmentId,
      _subscriberId: subscriberId,
      channel,
      deleted: { $exists: false },
    };

    const severityCondition: Array<MessageQuery> = [];
    if (severityArray && severityArray?.length > 0) {
      if (severityArray.includes(SeverityLevelEnum.NONE)) {
        severityCondition.push({ severity: { $exists: false } }, { severity: { $in: severityArray } });
      } else {
        query.severity = { $in: severityArray };
      }
    }

    if (contextKeys !== undefined) {
      const contextQuery = this.buildContextExactMatchQuery(contextKeys);
      query.$and = [...(query.$and ?? []), contextQuery];
    }

    if (tagGroups && tagGroups.length > 0) {
      query = mergeTagsMongoFragment(query, buildTagsQuery(tagGroups));
    }

    if (typeof read === 'boolean') {
      query.read = read;
    } else {
      query.read = { $in: [true, false] };
    }

    if (typeof archived === 'boolean') {
      if (!archived) {
        query.archived = false;
      } else {
        query.archived = true;
      }
    } else {
      query.archived = { $in: [true, false] };
    }

    // combine all $or conditions properly
    const orConditions: Array<MessageQuery> = [];
    if (severityCondition.length > 0) {
      orConditions.push({ $or: severityCondition });
    }

    if (orConditions.length > 0) {
      query.$and = [...(query.$and ?? []), ...orConditions];
    }

    if (typeof snoozed === 'boolean') {
      query.snoozedUntil = snoozed ? { $exists: true, $ne: null } : { $eq: null };
    }

    if (typeof seen === 'boolean') {
      query.seen = seen;
    } else {
      query.seen = { $in: [true, false] };
    }

    if (data) {
      const flatData = getFlatObject({ data });

      query = {
        ...flatData,
        ...query,
      };
    }

    if (createdGte || createdLte) {
      const createdAtFilter: { $gte?: Date; $lte?: Date } = {};
      if (createdGte) {
        createdAtFilter.$gte = createdGte;
      }
      if (createdLte) {
        createdAtFilter.$lte = createdLte;
      }
      query.createdAt = createdAtFilter;
    }

    return await this.cursorPagination({
      query,
      limit: options.limit,
      offset: options.offset,
      after: options.after,
      sort: { createdAt: -1, _id: -1 },
      paginateField: 'createdAt',
      enhanceQuery: (queryBuilder) =>
        queryBuilder
          .read('secondaryPreferred')
          .populate('subscriber', '_id firstName lastName avatar subscriberId')
          .populate('actorSubscriber', '_id firstName lastName avatar subscriberId')
          .populate({
            path: 'template',
            select: '_id name tags data critical triggers severity',
            options: {
              withDeleted: true,
            },
          }),
    });
  }

  async getCount(
    environmentId: string,
    subscriberId: string,
    channel: ChannelTypeEnum,
    query: {
      feedId?: string[];
      tagGroups?: string[][];
      seen?: boolean;
      read?: boolean;
      archived?: boolean;
      snoozed?: boolean;
      payload?: object;
      data?: Record<string, unknown>;
      severity?: SeverityLevelEnum[];
    } = {},
    options: { limit: number; skip?: number } = { limit: 100, skip: 0 },
    contextKeys?: string[],
    createdAt?: {
      $gte: Date;
    },
    readPreference: 'secondaryPreferred' | 'primary' = 'secondaryPreferred'
  ) {
    const requestQuery = await this.getFilterQueryForMessage(
      environmentId,
      subscriberId,
      channel,
      {
        feedId: query.feedId,
        seen: query.seen,
        tagGroups: query.tagGroups,
        read: query.read,
        archived: query.archived,
        payload: query.payload,
        snoozed: query.snoozed,
        data: query.data,
        severity: query.severity,
      },
      contextKeys,
      createdAt
    );

    return this.MongooseModel.countDocuments(requestQuery, options).read(readPreference);
  }

  async getCountBySeverity(
    environmentId: string,
    subscriberId: string,
    channel: ChannelTypeEnum,
    query: {
      read?: boolean;
      snoozed?: boolean;
    } = {},
    options: { limit: number; skip?: number } = { limit: 100, skip: 0 },
    contextKeys?: string[]
  ): Promise<{ severity: SeverityLevelEnum; count: number }[]> {
    const severityLevels = Object.values(SeverityLevelEnum);

    const promises = severityLevels.map((severity) =>
      this.getCount(environmentId, subscriberId, channel, { ...query, severity: [severity] }, options, contextKeys)
    );

    const results = await Promise.all(promises);

    return results.map((result, index) => ({ severity: severityLevels[index], count: result }));
  }

  private getReadSeenUpdateQuery(
    subscriberId: string,
    environmentId: string,
    markAs: MessagesStatusEnum
  ): Partial<MessageEntity> & EnforceEnvId {
    const updateQuery: Partial<MessageEntity> & EnforceEnvId = {
      _subscriberId: subscriberId,
      _environmentId: environmentId,
    };

    switch (markAs) {
      case MessagesStatusEnum.READ:
        return {
          ...updateQuery,
          read: false,
        };
      case MessagesStatusEnum.UNREAD:
        return {
          ...updateQuery,
          read: true,
        };
      case MessagesStatusEnum.SEEN:
        return {
          ...updateQuery,
          seen: false,
        };
      case MessagesStatusEnum.UNSEEN:
        return {
          ...updateQuery,
          seen: true,
        };
      default:
        return updateQuery;
    }
  }

  private getReadSeenUpdatePayload(markAs: MessagesStatusEnum): {
    read?: boolean;
    lastReadDate?: Date;
    seen?: boolean;
    lastSeenDate?: Date;
  } {
    const now = new Date();

    switch (markAs) {
      case MessagesStatusEnum.READ:
        return {
          read: true,
          lastReadDate: now,
          seen: true,
          lastSeenDate: now,
        };
      case MessagesStatusEnum.UNREAD:
        return {
          read: false,
          lastReadDate: now,
          seen: true,
          lastSeenDate: now,
        };
      case MessagesStatusEnum.SEEN:
        return {
          seen: true,
          lastSeenDate: now,
        };
      case MessagesStatusEnum.UNSEEN:
        return {
          seen: false,
          lastSeenDate: now,
        };
      default:
        return {};
    }
  }

  async markAllMessagesAs({
    subscriberId,
    environmentId,
    markAs,
    channel,
    feedIdentifiers,
  }: {
    subscriberId: string;
    environmentId: string;
    markAs: MessagesStatusEnum;
    channel?: ChannelTypeEnum;
    feedIdentifiers?: string[];
  }) {
    let feedQuery;

    if (feedIdentifiers) {
      const feeds = await this.feedRepository.find(
        {
          _environmentId: environmentId,
          identifier: {
            $in: feedIdentifiers,
          },
        },
        '_id'
      );

      feedQuery = {
        $in: feeds.map((feed) => feed._id),
      };
    }

    const updateQuery = this.getReadSeenUpdateQuery(subscriberId, environmentId, markAs);

    if (feedQuery != null) {
      updateQuery._feedId = feedQuery;
    }

    if (channel != null) {
      updateQuery.channel = channel;
    }

    const updatePayload = this.getReadSeenUpdatePayload(markAs);

    // Find documents that will be updated (only fetch IDs for performance)
    const documentsToUpdate = await this.find(updateQuery, '_id');

    if (documentsToUpdate.length === 0) {
      return [];
    }

    // Extract IDs for targeted update
    const documentIds = documentsToUpdate.map((doc) => doc._id);

    // Perform the update using document IDs in batches
    const chunks = this.chunkArray(documentIds);

    for (const chunk of chunks) {
      await this.update(
        {
          _id: { $in: chunk },
          _environmentId: environmentId,
        },
        { $set: updatePayload }
      );
    }

    // Fetch and return the updated documents
    return this.find({
      _id: { $in: documentIds },
      _environmentId: environmentId,
    });
  }

  async updateFeedByMessageTemplateId(environmentId: string, messageId: string, feedId?: string | null) {
    return this.update(
      { _environmentId: environmentId, _messageTemplateId: messageId },
      {
        $set: {
          _feedId: feedId,
        },
      }
    );
  }

  async updateMessageStatus(
    environmentId: string,
    id: string,
    status: 'error' | 'sent' | 'warning',
    providerPayload: any = {},
    errorId: string,
    errorText: string
  ) {
    return await this.update(
      {
        _environmentId: environmentId,
        _id: id,
      },
      {
        $set: {
          status,
          errorId,
          errorText,
          providerPayload,
        },
      }
    );
  }

  async changeMessagesStatus({
    environmentId,
    subscriberId,
    messageIds,
    markAs,
  }: {
    environmentId: string;
    subscriberId: string;
    messageIds: string[];
    markAs: MessagesStatusEnum;
  }): Promise<MessageEntity[]> {
    const updatePayload = this.getReadSeenUpdatePayload(markAs);
    const chunks = this.chunkArray(messageIds);

    for (const chunk of chunks) {
      await this.update(
        {
          _environmentId: environmentId,
          _subscriberId: subscriberId,
          _id: {
            $in: chunk.map((id) => new Types.ObjectId(id)),
          },
        },
        {
          $set: updatePayload,
        }
      );
    }

    return this.find({
      _environmentId: environmentId,
      _subscriberId: subscriberId,
      _id: { $in: messageIds.map((id) => new Types.ObjectId(id)) },
    });
  }

  /**
   * @deprecated
   */
  async changeStatus(
    environmentId: string,
    subscriberId: string,
    messageIds: string[],
    mark: { seen?: boolean; read?: boolean }
  ) {
    const requestQuery: FilterQuery<MessageEntity> = {};

    if (mark.seen != null) {
      requestQuery.seen = mark.seen;
      requestQuery.lastSeenDate = new Date();
    }

    if (mark.read != null) {
      requestQuery.read = mark.read;
      requestQuery.lastReadDate = new Date();
    }

    const chunks = this.chunkArray(messageIds);

    for (const chunk of chunks) {
      await this.update(
        {
          _environmentId: environmentId,
          _subscriberId: subscriberId,
          _id: {
            $in: chunk.map((id) => new Types.ObjectId(id)),
          },
        },
        {
          $set: requestQuery,
        }
      );
    }
  }

  async updateMessagesStatusByIds({
    environmentId,
    subscriberId,
    ids,
    seen,
    read,
    archived,
    snoozedUntil,
    contextKeys,
  }: {
    environmentId: string;
    subscriberId: string;
    ids: string[];
    seen?: boolean;
    read?: boolean;
    archived?: boolean;
    snoozedUntil?: Date | null;
    contextKeys?: string[];
  }): Promise<MessageEntity[]> {
    const query: MessageQuery & EnforceEnvId = {
      _environmentId: environmentId,
      _subscriberId: subscriberId,
      ...(contextKeys && contextKeys?.length > 0 && { contextKeys: { $in: contextKeys } }),
      _id: {
        $in: ids.map((id) => {
          return new Types.ObjectId(id);
        }),
      },
    };

    return await this.updateMessagesStatus({
      query,
      seen,
      read,
      archived,
      snoozedUntil,
    });
  }

  async updateMessagesFromToStatus({
    environmentId,
    subscriberId,
    contextKeys,
    from,
    to,
  }: {
    environmentId: string;
    subscriberId: string;
    contextKeys?: string[];
    from: {
      tagGroups?: string[][];
      data?: Record<string, unknown>;
      seen?: boolean;
      read?: boolean;
      archived?: boolean;
    };
    to: {
      seen?: boolean;
      read?: boolean;
      archived?: boolean;
    };
  }): Promise<MessageEntity[]> {
    const isFromSeen = from.seen !== undefined;
    const isFromRead = from.read !== undefined;
    const isFromArchived = from.archived !== undefined;
    const flatData = from.data ? getFlatObject({ data: from.data }) : {};

    let query: MessageQuery & EnforceEnvId = {
      ...flatData,
      _environmentId: environmentId,
      _subscriberId: subscriberId,
      ...(contextKeys && contextKeys?.length > 0 && { contextKeys: { $in: contextKeys } }),
    };

    if (from.tagGroups && from.tagGroups.length > 0) {
      query = mergeTagsMongoFragment(query, buildTagsQuery(from.tagGroups));
    }

    if (isFromArchived) {
      if (!from.archived) {
        query.archived = false;
      } else {
        query.archived = true;
      }
    } else if (isFromRead) {
      query.read = from.read;
    } else if (isFromSeen) {
      query.seen = from.seen;
    }

    return await this.updateMessagesStatus({
      query,
      ...to,
    });
  }

  /**
   * Allows to update the status of queried messages at once.
   * The status can be updated to seen, unseen, read, unread, archived, unarchived, snoozed, unsnoozed.
   * Depending on the flag passed, the other flags will be updated accordingly.
   * For example:
   * seen -> { seen: true }
   * read -> { seen: true, read: true }
   * archived -> { seen: true, read: true, archived: true }
   * unseen -> { seen: false, read: false, archived: false }
   * unread -> { seen: true, read: false, archived: false }
   * unarchived -> { seen: true, read: true, archived: false }
   * snoozed -> { seen: true, archived: false, snoozedUntil: snoozedUntil }
   * unsnoozed -> { seen: true, archived: false, snoozedUntil: null }
   */
  private async updateMessagesStatus({
    query,
    seen,
    read,
    archived,
    snoozedUntil,
  }: {
    query: MessageQuery & EnforceEnvId;
    seen?: boolean;
    read?: boolean;
    archived?: boolean;
    snoozedUntil?: Date | null;
  }): Promise<MessageEntity[]> {
    const isUpdatingSeen = seen !== undefined;
    const isUpdatingRead = read !== undefined;
    const isUpdatingArchived = archived !== undefined;
    const isUpdatingSnoozed = snoozedUntil !== undefined;

    let updatePayload: FilterQuery<MessageEntity> = {};

    if (isUpdatingArchived) {
      updatePayload = {
        seen: true,
        lastSeenDate: new Date(),
        read: true,
        lastReadDate: new Date(),
        archived,
        archivedAt: archived ? new Date() : null,
      };
    } else if (isUpdatingRead) {
      updatePayload = {
        seen: true,
        lastSeenDate: new Date(),
        read,
        lastReadDate: read ? new Date() : null,
        archived: !read ? false : undefined,
        archivedAt: !read ? null : undefined,
      };
    } else if (isUpdatingSeen) {
      updatePayload = {
        seen,
        lastSeenDate: seen ? new Date() : null,
        read: !seen ? false : undefined,
        lastReadDate: !seen ? null : undefined,
        archived: !seen ? false : undefined,
        archivedAt: !seen ? null : undefined,
      };

      // If unseen, clear firstSeenDate
      if (!seen) {
        updatePayload.firstSeenDate = null;
      }
    } else if (isUpdatingSnoozed) {
      updatePayload = {
        snoozedUntil,
        seen: true,
        lastSeenDate: new Date(),
        archived: false,
        archivedAt: null,
      };
    }

    // Find documents that will be updated (only fetch IDs for performance)
    const documentsToUpdate = await this.find(query, '_id');

    if (documentsToUpdate.length === 0) {
      return [];
    }

    // Extract IDs for targeted update
    const documentIds = documentsToUpdate.map((doc) => doc._id);
    const idQuery = { _id: { $in: documentIds }, _environmentId: query._environmentId };

    // Handle firstSeenDate logic separately for operations that mark as seen
    const shouldMarkAsSeen = isUpdatingArchived || isUpdatingRead || (isUpdatingSeen && seen) || isUpdatingSnoozed;

    // Batch the updates
    const chunks = this.chunkArray(documentIds);

    for (const chunk of chunks) {
      const chunkQuery = { _id: { $in: chunk }, _environmentId: query._environmentId };

      if (shouldMarkAsSeen) {
        await this.update(chunkQuery, { $set: updatePayload }, { writeConcern: { w: 1 } });
        await this.update(
          { ...chunkQuery, firstSeenDate: { $exists: false } },
          { $set: { firstSeenDate: new Date() } },
          { writeConcern: { w: 1 } }
        );
      } else {
        await this.update(chunkQuery, { $set: updatePayload });
      }
    }

    return this.find(idQuery, undefined, { limit: 100 });
  }

  async updateActionStatus({
    environmentId,
    subscriberId,
    id,
    actionType,
    actionStatus,
  }: {
    environmentId: string;
    subscriberId: string;
    id: string;
    actionType: ButtonTypeEnum;
    actionStatus: MessageActionStatusEnum;
  }) {
    const message = await this.findOne({
      _id: id,
      _environmentId: environmentId,
      _subscriberId: subscriberId,
    });

    if (!message) {
      throw new DalException(`Could not find a message with id ${id}`);
    }

    const isUpdatingPrimaryCta = actionType === ButtonTypeEnum.PRIMARY;
    const isUpdatingSecondaryCta = actionType === ButtonTypeEnum.SECONDARY;
    const updatePayload: FilterQuery<MessageEntity> = !message.read
      ? {
          seen: true,
          lastSeenDate: new Date(),
          read: true,
          lastReadDate: new Date(),
        }
      : {};

    if (isUpdatingPrimaryCta) {
      updatePayload['cta.action.result.type'] = ButtonTypeEnum.PRIMARY;
      updatePayload['cta.action.status'] = actionStatus;
    }

    if (isUpdatingSecondaryCta) {
      updatePayload['cta.action.result.type'] = ButtonTypeEnum.SECONDARY;
      updatePayload['cta.action.status'] = actionStatus;
    }

    await this.update(
      {
        _environmentId: environmentId,
        _subscriberId: subscriberId,
        _id: id,
      },
      {
        $set: updatePayload,
      }
    );
  }

  async findMessageById(query: { _id: string; _environmentId: string }): Promise<MessageEntity | null> {
    const res = await this.MongooseModel.findOne({ _id: query._id, _environmentId: query._environmentId })
      .populate('subscriber')
      .populate({
        path: 'actorSubscriber',
        match: {
          'actor.type': ActorTypeEnum.USER,
          _actorId: { $exists: true },
        },
        select: '_id firstName lastName avatar subscriberId',
      });

    return this.mapEntity(res);
  }

  async findWithSubscriber(
    query: MessageQuery & EnforceEnvId,
    select: ProjectionType<MessageEntity> = ''
  ): Promise<MessageEntity[]> {
    const res = await this.MongooseModel.find(query, select).populate('subscriber', 'subscriberId').lean().exec();

    const mappedEntities = this.mapEntities(res);

    // Flatten subscriber data - move subscriber.subscriberId to root level
    return mappedEntities.map((entity) => {
      if (entity.subscriber?.subscriberId) {
        return {
          ...entity,
          subscriberId: entity.subscriber.subscriberId,
          subscriber: undefined, // Remove the nested subscriber object
        };
      }

      return entity;
    });
  }

  async findMessagesByTransactionId(
    query: {
      transactionId: string[];
      _environmentId: string;
    } & Partial<Omit<MessageEntity, 'transactionId'>>
  ) {
    const res = await this.MongooseModel.find({
      transactionId: {
        $in: query.transactionId,
      },
      _environmentId: query._environmentId,
    })
      .populate('subscriber')
      .populate({
        path: 'actorSubscriber',
        match: {
          'actor.type': ActorTypeEnum.USER,
          _actorId: { $exists: true },
        },
        select: '_id firstName lastName avatar subscriberId',
      });

    return this.mapEntities(res);
  }

  async getMessages(
    query: Partial<Omit<MessageEntity, 'transactionId'>> & {
      _environmentId: string;
      transactionId?: string[];
      contextKeys?: string[];
    },
    select = '',
    options?: {
      limit?: number;
      skip?: number;
      sort?: { [key: string]: number };
    }
  ) {
    const filterQuery: FilterQuery<MessageEntity> = { ...query };
    if (query.transactionId) {
      filterQuery.transactionId = { $in: query.transactionId };
    }

    if (query.contextKeys !== undefined) {
      const contextQuery = this.buildContextExactMatchQuery(query.contextKeys);
      filterQuery.$and = [...(filterQuery.$and ?? []), contextQuery];
    }

    const data = await this.MongooseModel.find(filterQuery, select, {
      sort: options?.sort,
      limit: options?.limit,
      skip: options?.skip,
    })
      .read('secondaryPreferred')
      .populate(
        'subscriber',
        '_id firstName lastName avatar subscriberId createdAt updatedAt _organizationId _environmentId deleted'
      )
      .populate(
        'actorSubscriber',
        '_id firstName lastName avatar subscriberId createdAt updatedAt _organizationId _environmentId deleted'
      );

    const entities = this.mapEntities(data);

    return this.normalizeDeviceTokens(entities);
  }

  /**
   * Legacy Mongoose schema defined deviceTokens as [Schema.Types.Array] instead of [Schema.Types.String],
   * causing tokens to be stored as nested arrays (e.g. [["token1"]] instead of ["token1"]).
   * This normalizes existing corrupted data so the API returns a flat string array matching the Zod schema.
   */
  private normalizeDeviceTokens(messages: MessageEntity[]): MessageEntity[] {
    for (const message of messages) {
      if (Array.isArray(message.deviceTokens)) {
        message.deviceTokens = message.deviceTokens
          .flat(Infinity)
          .filter((token): token is string => typeof token === 'string');
      }
    }

    return messages;
  }

  async deleteMessagesByIds({
    environmentId,
    subscriberId,
    ids,
  }: {
    environmentId: string;
    subscriberId: string;
    ids: string[];
  }): Promise<MessageEntity[]> {
    const chunks = this.chunkArray(ids);
    const allDeletedMessages: MessageEntity[] = [];

    for (const chunk of chunks) {
      const query: MessageQuery & EnforceEnvId = {
        _environmentId: environmentId,
        _subscriberId: subscriberId,
        _id: {
          $in: chunk.map((id) => new Types.ObjectId(id)),
        },
      };

      const messagesToDelete = await this.find(query);
      await this.delete(query);
      allDeletedMessages.push(...messagesToDelete);
    }

    return allDeletedMessages;
  }

  async deleteMessagesWithFilters({
    environmentId,
    subscriberId,
    filters,
    contextKeys,
  }: {
    environmentId: string;
    subscriberId: string;
    filters: {
      tagGroups?: string[][];
      data?: Record<string, unknown>;
      read?: boolean;
      archived?: boolean;
    };
    contextKeys?: string[];
  }): Promise<MessageEntity[]> {
    const flatData = filters.data ? getFlatObject({ data: filters.data }) : {};

    let query: MessageQuery & EnforceEnvId = {
      ...flatData,
      _environmentId: environmentId,
      _subscriberId: subscriberId,
      ...(contextKeys && contextKeys?.length > 0 && { contextKeys: { $in: contextKeys } }),
    };

    if (filters.tagGroups && filters.tagGroups.length > 0) {
      query = mergeTagsMongoFragment(query, buildTagsQuery(filters.tagGroups));
    }

    const isReadFiltered = filters.read !== undefined;
    const isArchivedFiltered = filters.archived !== undefined;

    if (isArchivedFiltered) {
      if (!filters.archived) {
        query.$or = [{ archived: { $exists: false } }, { archived: false }];
      } else {
        query.archived = true;
      }
    } else if (isReadFiltered) {
      if (!filters.read) {
        query.$or = [{ read: { $exists: false } }, { read: false }];
      } else {
        query.read = true;
      }
    }

    // First, retrieve the messages that will be deleted for webhook events
    const messagesToDelete = await this.find(query);

    // Then delete them
    await this.delete(query);

    return messagesToDelete;
  }

  private transformContextKeysQuery(query: FilterQuery<MessageDBModel>): FilterQuery<MessageDBModel> {
    if (!('contextKeys' in query)) {
      return query;
    }

    const contextKeys = query.contextKeys as string[] | undefined;
    const { contextKeys: _, ...restQuery } = query;

    // undefined = feature disabled, skip context filtering
    if (contextKeys === undefined) {
      return restQuery;
    }

    return {
      ...restQuery,
      ...this.buildContextExactMatchQuery(contextKeys),
    };
  }
}
