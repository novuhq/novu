import { ChannelTypeEnum } from '@novu/shared';
import { FilterQuery, Types } from 'mongoose';
import { BaseRepository } from '../base-repository';
import { Job } from '../job';
import { NotificationEntity } from './notification.entity';
import { Notification } from './notification.schema';

export class NotificationRepository extends BaseRepository<NotificationEntity> {
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
    query: { channels?: ChannelTypeEnum[]; templates?: string[]; subscriberIds?: string[] } = {},
    skip = 0,
    limit = 10
  ) {
    const requestQuery: FilterQuery<NotificationEntity> = {
      _environmentId: environmentId,
    };

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

    let ids = [];

    if (query?.channels) {
      ids = await Job.find(
        {
          type: {
            $in: query.channels,
          },
        },
        '_notificationId'
      ).distinct('_notificationId');
    }

    if (ids.length > 0) {
      requestQuery._id = {
        $in: ids,
      };
    }

    const totalCount = await Notification.countDocuments(requestQuery);

    const response = await Notification.find(requestQuery)
      .populate('subscriber', 'firstName _id lastName email')
      .populate('template', 'name _id')
      .populate({
        path: 'jobs',
        populate: { path: 'executionDetails' },
      })
      .skip(skip)
      .limit(limit)
      .sort('-createdAt');

    return {
      totalCount,
      data: this.mapEntities(response),
    };
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
