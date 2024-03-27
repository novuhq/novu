import { FilterQuery, QueryWithHelpers, Types } from 'mongoose';
import { ChannelTypeEnum, StepTypeEnum } from '@novu/shared';
import { subMonths, subWeeks } from 'date-fns';

import { BaseRepository } from '../base-repository';
import { NotificationEntity, NotificationDBModel } from './notification.entity';
import { Notification } from './notification.schema';
import type { EnforceEnvOrOrgIds } from '../../types';
import { EnvironmentId } from '../environment';

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
    query: {
      channels?: ChannelTypeEnum[] | null;
      templates?: string[] | null;
      subscriberIds?: string[];
      transactionId?: string;
    } = {},
    skip = 0,
    limit = 10
  ) {
    const requestQuery: FilterQuery<NotificationDBModel> = {
      _environmentId: environmentId,
    };

    if (query.transactionId) {
      requestQuery.transactionId = query.transactionId;
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

    const response = await this.populateFeed(this.MongooseModel.find(requestQuery), environmentId)
      .read('secondaryPreferred')
      .skip(skip)
      .limit(limit)
      .sort('-createdAt');

    return {
      data: this.mapEntities(response),
    };
  }

  public async getFeedItem(notificationId: string, _environmentId: string, _organizationId: string) {
    const requestQuery: FilterQuery<NotificationDBModel> = {
      _id: notificationId,
      _environmentId,
      _organizationId,
    };

    return this.mapEntity(await this.populateFeed(this.MongooseModel.findOne(requestQuery), _environmentId));
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
        select: '_id name triggers',
      })
      .populate({
        options: {
          readPreference: 'secondaryPreferred',
          sort: { createdAt: 1 },
        },
        path: 'jobs',
        match: {
          _environmentId: new Types.ObjectId(environmentId),
          type: {
            $nin: [StepTypeEnum.TRIGGER],
          },
        },
        select: 'createdAt digest payload overrides to tenant actorId providerId step status type updatedAt',
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
}
