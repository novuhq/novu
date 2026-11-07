import { ChannelTypeEnum, DeliveryLifecycleEventType, SeverityLevelEnum, StepTypeEnum } from '@novu/shared';
import { subMonths, subWeeks } from 'date-fns';
import { FilterQuery, QueryWithHelpers, Types } from 'mongoose';

import type { EnforceEnvOrOrgIds } from '../../types';
import { BaseRepository } from '../base-repository';
import { EnvironmentId } from '../environment';
import { NotificationDBModel, NotificationEntity, TerminalWorkflowStatusEvent } from './notification.entity';
import { NotificationFeedItemEntity } from './notification.feed.Item.entity';
import { Notification } from './notification.schema';

const DELIVERY_LIFECYCLE_ORDER: Record<DeliveryLifecycleEventType, number> = {
  workflow_run_delivery_pending: 0,
  workflow_run_delivery_sent: 1,
  workflow_run_delivery_delivered: 2,
  workflow_run_delivery_interacted: 3,
  workflow_run_delivery_skipped: -1,
  workflow_run_delivery_canceled: -1,
  workflow_run_delivery_errored: -1,
  workflow_run_delivery_merged: -1,
};

const TERMINAL_EVENTS: DeliveryLifecycleEventType[] = [
  'workflow_run_delivery_skipped',
  'workflow_run_delivery_canceled',
  'workflow_run_delivery_errored',
  'workflow_run_delivery_merged',
  'workflow_run_delivery_interacted',
];

export interface NotificationFeedFilters {
  channels?: ChannelTypeEnum[] | null;
  templates?: string[] | null;
  subscriberIds?: string[];
  transactionId?: string[];
  topicKey?: string;
  subscriptionId?: string;
  severity?: SeverityLevelEnum[] | null;
  after?: string;
  before?: string;
  contextKeys?: string[];
}

export type WorkflowRunStatusFilter = 'processing' | 'completed' | 'error';

export interface WorkflowRunsPageFilters extends NotificationFeedFilters {
  statuses?: WorkflowRunStatusFilter[];
}

export interface WorkflowRunsPageCursor {
  createdAt: string;
  id: string;
}

export interface FindWorkflowRunsPageParams {
  environmentId: string;
  filters: WorkflowRunsPageFilters;
  cursor?: WorkflowRunsPageCursor;
  limit: number;
  direction: 'ASC' | 'DESC';
}

export type NotificationWorkflowRunItem = Pick<
  NotificationEntity,
  | '_id'
  | '_templateId'
  | '_environmentId'
  | '_organizationId'
  | '_subscriberId'
  | 'transactionId'
  | 'to'
  | 'topics'
  | 'channels'
  | 'severity'
  | 'critical'
  | 'contextKeys'
  | 'lastEmittedDeliveryEvent'
  | 'lastEmittedWorkflowStatusEvent'
  | '_digestedNotificationId'
  | 'createdAt'
  | 'updatedAt'
>;

const WORKFLOW_RUNS_PAGE_PROJECTION: Record<keyof NotificationWorkflowRunItem, 1> = {
  _id: 1,
  _templateId: 1,
  _environmentId: 1,
  _organizationId: 1,
  _subscriberId: 1,
  transactionId: 1,
  to: 1,
  topics: 1,
  channels: 1,
  severity: 1,
  critical: 1,
  contextKeys: 1,
  lastEmittedDeliveryEvent: 1,
  lastEmittedWorkflowStatusEvent: 1,
  _digestedNotificationId: 1,
  createdAt: 1,
  updatedAt: 1,
};

const WORKFLOW_STATUS_EVENT_BY_FILTER: Record<WorkflowRunStatusFilter, TerminalWorkflowStatusEvent | null> = {
  processing: null,
  completed: 'workflow_run_status_completed',
  error: 'workflow_run_status_error',
};

export class NotificationRepository extends BaseRepository<
  NotificationDBModel,
  NotificationEntity,
  EnforceEnvOrOrgIds
> {
  constructor() {
    super(Notification, NotificationEntity);
  }

  async findBySubscriberId(environmentId: string, subscriberId: string) {
    return await this.find({
      _environmentId: environmentId,
      _subscriberId: subscriberId,
    });
  }

  async getFeed(
    environmentId: string,
    query: NotificationFeedFilters = {},
    skip = 0,
    limit = 10
  ): Promise<NotificationFeedItemEntity[]> {
    const requestQuery = this.buildFeedQuery(environmentId, query);

    const response = await this.populateFeed(this.MongooseModel.find(requestQuery), environmentId)
      .read('secondaryPreferred')
      .skip(skip)
      .limit(limit)
      .sort('-createdAt');

    return this.toFeedItems(response);
  }

  /**
   * Keyset page of workflow runs ordered by (createdAt, _id), without populating jobs.
   * DESC returns runs older than the cursor, ASC returns runs newer than it.
   */
  async findWorkflowRunsPage(params: FindWorkflowRunsPageParams): Promise<NotificationWorkflowRunItem[]> {
    const sortOrder = params.direction === 'DESC' ? -1 : 1;
    const response = await this.MongooseModel.find(
      this.buildWorkflowRunsPageQuery(params),
      WORKFLOW_RUNS_PAGE_PROJECTION
    )
      .sort({ createdAt: sortOrder, _id: sortOrder })
      .limit(params.limit)
      .read('secondaryPreferred')
      .lean();

    return this.mapEntities(response);
  }

  buildWorkflowRunsPageQuery({
    environmentId,
    filters,
    cursor,
    direction,
  }: Omit<FindWorkflowRunsPageParams, 'limit'>): FilterQuery<NotificationDBModel> {
    const requestQuery = this.buildFeedQuery(environmentId, filters);
    const andConditions: Array<FilterQuery<NotificationDBModel>> = [];

    if (filters.statuses?.length) {
      andConditions.push({
        lastEmittedWorkflowStatusEvent: {
          $in: filters.statuses.map((status) => WORKFLOW_STATUS_EVENT_BY_FILTER[status]),
        },
      });
    }

    if (cursor) {
      const operator = direction === 'DESC' ? '$lt' : '$gt';
      const cursorCreatedAt = new Date(cursor.createdAt);
      andConditions.push({
        $or: [
          { createdAt: { [operator]: cursorCreatedAt } },
          { createdAt: cursorCreatedAt, _id: { [operator]: cursor.id } },
        ],
      });
    }

    if (andConditions.length > 0) {
      requestQuery.$and = [...(requestQuery.$and ?? []), ...andConditions];
    }

    return requestQuery;
  }

  private buildFeedQuery(environmentId: string, query: NotificationFeedFilters): FilterQuery<NotificationDBModel> {
    const requestQuery: FilterQuery<NotificationDBModel> = {
      _environmentId: environmentId,
    };

    if (query.transactionId && query.transactionId.length > 0) {
      requestQuery.transactionId = {
        $in: query.transactionId,
      };
    }

    if (query.topicKey) {
      requestQuery['topics.topicKey'] = query.topicKey;
    }

    if (query.subscriptionId) {
      requestQuery['topics.preferenceEvaluation.subscriptionIdentifier'] = query.subscriptionId;
    }

    const includesNoSeverity = Boolean(query.severity?.includes(SeverityLevelEnum.NONE));
    if (query.severity?.length && !includesNoSeverity) {
      requestQuery.severity = { $in: query.severity };
    }

    const createdAtRange = this.buildCreatedAtRange(query.after, query.before);
    if (createdAtRange) {
      requestQuery.createdAt = createdAtRange;
    }

    if (query?.templates) {
      requestQuery._templateId = {
        $in: query.templates,
      };
    }

    if (query.subscriberIds && query.subscriberIds.length > 0) {
      requestQuery._subscriberId = {
        $in: query.subscriberIds,
      };
    }

    if (query?.channels) {
      requestQuery.channels = {
        $in: query.channels,
      };
    }

    if (query.contextKeys !== undefined) {
      const contextQuery = this.buildContextExactMatchQuery(query.contextKeys);
      requestQuery.$and = [...(requestQuery.$and ?? []), contextQuery];
    }

    if (query.severity?.length && includesNoSeverity) {
      requestQuery.$and = [
        ...(requestQuery.$and ?? []),
        { $or: [{ severity: { $exists: false } }, { severity: { $in: query.severity } }] },
      ];
    }

    return requestQuery;
  }

  private buildCreatedAtRange(after?: string, before?: string): { $gte?: string; $lte?: string } | undefined {
    if (!after && !before) {
      return undefined;
    }

    return {
      ...(after && { $gte: after }),
      ...(before && { $lte: before }),
    };
  }

  /** NotificationEntity has no class-transformer metadata, so a JSON copy is what mapEntity would return. */
  private toFeedItem(populatedNotification: unknown): NotificationFeedItemEntity {
    return JSON.parse(JSON.stringify(populatedNotification));
  }

  private toFeedItems(populatedNotifications: unknown): NotificationFeedItemEntity[] {
    return JSON.parse(JSON.stringify(populatedNotifications));
  }

  public async getFeedItem(
    notificationId: string,
    _environmentId: string,
    _organizationId: string
  ): Promise<NotificationFeedItemEntity> {
    const requestQuery: FilterQuery<NotificationDBModel> = {
      _id: notificationId,
      _environmentId,
      _organizationId,
    };

    return this.toFeedItem(await this.populateFeed(this.MongooseModel.findOne(requestQuery), _environmentId));
  }

  public async findMetadataForTraces(
    notificationId: string,
    _environmentId: string,
    _organizationId: string
  ): Promise<NotificationFeedItemEntity> {
    const requestQuery: FilterQuery<NotificationDBModel> = {
      _id: notificationId,
      _environmentId,
      _organizationId,
    };

    return this.toFeedItem(
      await this.populateFeedWithoutExecutionDetails(this.MongooseModel.findOne(requestQuery), _environmentId)
    );
  }

  public async findNotificationMetadataOnly(
    notificationId: string,
    _environmentId: string,
    _organizationId: string
  ): Promise<NotificationFeedItemEntity> {
    const requestQuery: FilterQuery<NotificationDBModel> = {
      _id: notificationId,
      _environmentId,
      _organizationId,
    };

    return this.toFeedItem(await this.populateNotificationMetadataOnly(this.MongooseModel.findOne(requestQuery)));
  }

  private populateFeed(query: QueryWithHelpers<unknown, unknown, unknown>, environmentId: string) {
    return query
      .populate({
        options: {
          readPreference: 'secondaryPreferred',
        },
        path: 'subscriber',
        select: 'firstName _id lastName email phone subscriberId',
      })
      .populate({
        options: {
          readPreference: 'secondaryPreferred',
        },
        path: 'template',
        select: '_id name triggers origin',
      })
      .populate({
        options: {
          readPreference: 'secondaryPreferred',
          sort: { createdAt: 1, _parentId: 1 },
        },
        path: 'jobs',
        match: {
          _environmentId: new Types.ObjectId(environmentId),
          type: {
            $nin: [StepTypeEnum.TRIGGER],
          },
        },
        select:
          'createdAt digest payload overrides to tenant actorId providerId step status type updatedAt _parentId scheduleExtensionsCount',
        populate: [
          {
            path: 'executionDetails',
            select: 'createdAt detail isRetry isTest providerId raw source status updatedAt webhookStatus',
            options: {
              sort: { createdAt: 1 },
            },
          },
          {
            path: 'step',
            select: '_parentId _templateId active filters template',
          },
        ],
      });
  }

  private populateFeedWithoutExecutionDetails(
    query: QueryWithHelpers<unknown, unknown, unknown>,
    environmentId: string
  ) {
    return query
      .populate({
        options: {
          readPreference: 'secondaryPreferred',
        },
        path: 'subscriber',
        select: 'firstName _id lastName email phone subscriberId',
      })
      .populate({
        options: {
          readPreference: 'secondaryPreferred',
        },
        path: 'template',
        select: '_id name triggers origin',
      })
      .populate({
        options: {
          readPreference: 'secondaryPreferred',
          sort: { createdAt: 1, _parentId: 1 },
        },
        path: 'jobs',
        match: {
          _environmentId: new Types.ObjectId(environmentId),
          type: {
            $nin: [StepTypeEnum.TRIGGER],
          },
        },
        select:
          'createdAt digest payload overrides to tenant actorId providerId step status type updatedAt _parentId scheduleExtensionsCount',
        populate: [
          {
            path: 'step',
            select: '_parentId _templateId active filters template',
          },
        ],
      });
  }

  private populateNotificationMetadataOnly(query: QueryWithHelpers<unknown, unknown, unknown>) {
    return query
      .populate({
        options: {
          readPreference: 'secondaryPreferred',
        },
        path: 'subscriber',
        select: 'firstName _id lastName email phone subscriberId',
      })
      .populate({
        options: {
          readPreference: 'secondaryPreferred',
        },
        path: 'template',
        select: '_id name triggers origin',
      });
  }

  async getActivityGraphStats(date: Date, environmentId: string) {
    return await this.aggregate(
      [
        {
          $match: {
            createdAt: { $gte: date },
            _environmentId: new Types.ObjectId(environmentId),
          },
        },
        { $unwind: '$channels' },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
            },
            count: {
              $sum: 1,
            },
            templates: { $addToSet: '$_templateId' },
            channels: { $addToSet: '$channels' },
          },
        },
        { $sort: { createdAt: -1 } },
      ],
      {
        readPreference: 'secondaryPreferred',
      }
    );
  }

  async getStats(environmentId: EnvironmentId): Promise<{ weekly: number; monthly: number }> {
    const now: number = Date.now();
    const monthBefore = subMonths(now, 1);
    const weekBefore = subWeeks(now, 1);

    const result = await this.aggregate(
      [
        {
          $match: {
            _environmentId: this.convertStringToObjectId(environmentId),
            createdAt: {
              $gte: monthBefore,
            },
          },
        },
        {
          $group: {
            _id: null,
            weekly: { $sum: { $cond: [{ $gte: ['$createdAt', weekBefore] }, 1, 0] } },
            monthly: { $sum: 1 },
          },
        },
      ],
      {
        readPreference: 'secondaryPreferred',
      }
    );

    const stats = result[0] || {};

    return {
      weekly: stats.weekly || 0,
      monthly: stats.monthly || 0,
    };
  }

  estimatedDocumentCount() {
    return this.MongooseModel.estimatedDocumentCount();
  }

  /**
   * Atomically transitions a notification's delivery lifecycle event forward only.
   * Prevents backward transitions and returns whether the update succeeded.
   */
  async tryDeliveryLifecycleTransition(
    notificationId: string,
    organizationId: string,
    environmentId: string,
    targetEvent: DeliveryLifecycleEventType
  ): Promise<{ isUpdated: boolean; previousEvent?: DeliveryLifecycleEventType }> {
    const targetOrder = DELIVERY_LIFECYCLE_ORDER[targetEvent];
    const isTerminal = TERMINAL_EVENTS.includes(targetEvent);

    const progressionEvents = Object.entries(DELIVERY_LIFECYCLE_ORDER)
      .filter(([, order]) => order >= 0 && order < targetOrder)
      .map(([event]) => event as DeliveryLifecycleEventType);

    const condition: FilterQuery<NotificationDBModel> = isTerminal
      ? {
          $or: [
            { lastEmittedDeliveryEvent: { $exists: false } },
            { lastEmittedDeliveryEvent: null },
            { lastEmittedDeliveryEvent: 'workflow_run_delivery_pending' },
          ],
        }
      : {
          $or: [
            { lastEmittedDeliveryEvent: { $exists: false } },
            { lastEmittedDeliveryEvent: null },
            { lastEmittedDeliveryEvent: { $in: progressionEvents } },
          ],
        };

    const result = await this.findOneAndUpdate(
      {
        _id: notificationId,
        _organizationId: organizationId,
        _environmentId: environmentId,
        ...condition,
      },
      { $set: { lastEmittedDeliveryEvent: targetEvent } },
      { returnDocument: 'before' }
    );

    return {
      isUpdated: result !== null,
      previousEvent: result?.lastEmittedDeliveryEvent as DeliveryLifecycleEventType | undefined,
    };
  }

  /**
   * Atomically records the first terminal workflow status event for a notification.
   * Once completed or error is set, neither is emitted again.
   */
  async tryWorkflowStatusTransition(
    notificationId: string,
    organizationId: string,
    environmentId: string,
    targetEvent: TerminalWorkflowStatusEvent
  ): Promise<{ isUpdated: boolean }> {
    const result = await this.findOneAndUpdate(
      {
        _id: notificationId,
        _organizationId: organizationId,
        _environmentId: environmentId,
        $or: [{ lastEmittedWorkflowStatusEvent: { $exists: false } }, { lastEmittedWorkflowStatusEvent: null }],
      },
      { $set: { lastEmittedWorkflowStatusEvent: targetEvent } },
      { returnDocument: 'before' }
    );

    return {
      isUpdated: result !== null,
    };
  }
}
