import { ChannelTypeEnum, StepTypeEnum } from '@novu/shared';
import { Document, FilterQuery, QueryWithHelpers, Types } from 'mongoose';
import { BaseRepository, Omit } from '../base-repository';
import { NotificationEntity } from './notification.entity';
import { Notification } from './notification.schema';

class PartialIntegrationEntity extends Omit(NotificationEntity, ['_environmentId', '_organizationId']) {}

type EnforceEnvironmentQuery = FilterQuery<PartialIntegrationEntity & Document> &
  ({ _environmentId: string } | { _organizationId: string });

export class NotificationRepository extends BaseRepository<EnforceEnvironmentQuery, NotificationEntity> {
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
      channels?: ChannelTypeEnum[];
      templates?: string[];
      subscriberIds?: string[];
      transactionId?: string;
    } = {},
    skip = 0,
    limit = 10
  ) {
    const requestQuery: EnforceEnvironmentQuery = {
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

    if (query.subscriberIds.length > 0) {
      requestQuery._subscriberId = {
        $in: query.subscriberIds,
      };
    }

    if (query?.channels) {
      requestQuery.channels = {
        $in: query.channels,
      };
    }

    const totalCount = await Notification.countDocuments(requestQuery);

    const response = await this.populateFeed(Notification.find(requestQuery))
      .skip(skip)
      .limit(limit)
      .sort('-createdAt');

    return {
      totalCount,
      data: this.mapEntities(response),
    };
  }

  public async getFeedItem(notificationId: string, _environmentId: string, _organizationId: string) {
    const requestQuery: EnforceEnvironmentQuery = {
      _id: notificationId,
      _environmentId,
      _organizationId,
    };

    return this.mapEntity(await this.populateFeed(Notification.findOne(requestQuery)));
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
        select: 'createdAt digest payload providerId step status type updatedAt',
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
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: {
            $sum: 1,
          },
        },
      },
      { $sort: { _id: -1 } },
    ]);
  }
}
