import { FilterQuery, QueryWithHelpers, Types } from 'mongoose';
import { ChannelTypeEnum, StepTypeEnum } from '@novu/shared';

import { BaseRepository } from '../base-repository';
import { NotificationEntity, NotificationDBModel } from './notification.entity';
import { Notification } from './notification.schema';
import type { EnforceEnvOrOrgIds } from '../../types/enforce';

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

    const totalCount = await this.MongooseModel.countDocuments(requestQuery);

    const response = await this.populateFeed(this.MongooseModel.find(requestQuery))
      .skip(skip)
      .limit(limit)
      .sort('-createdAt');

    return {
      totalCount,
      data: this.mapEntities(response),
    };
  }

  public async getFeedItem(notificationId: string, _environmentId: string, _organizationId: string) {
    const requestQuery: FilterQuery<NotificationDBModel> = {
      _id: notificationId,
      _environmentId,
      _organizationId,
    };

    return this.mapEntity(await this.populateFeed(this.MongooseModel.findOne(requestQuery)));
  }

  private populateFeed(query: QueryWithHelpers<unknown, unknown, unknown>) {
    return query
      .populate('subscriber', 'firstName _id lastName email phone')
      .populate('template', '_id name triggers')
      .populate({
        path: 'jobs',
        match: {
          type: {
            $nin: [StepTypeEnum.TRIGGER],
          },
        },
        select: 'createdAt digest payload overrides to providerId step status type updatedAt',
        populate: [
          {
            path: 'executionDetails',
            select: 'createdAt detail isRetry isTest providerId raw source status updatedAt webhookStatus',
          },
          {
            path: 'step',
            select: '_parentId _templateId active filters template',
          },
        ],
      });
  }

  async getActivityGraphStats(date: Date, environmentId: string) {
    return await this.aggregate([
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
      { $sort: { _id: -1 } },
    ]);
  }
}
