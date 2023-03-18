import { ProjectionType, FilterQuery } from 'mongoose';

import { BaseRepository } from '../base-repository';
import { JobEntity, JobDBModel, JobStatusEnum } from './job.entity';
import { Job } from './job.schema';
import { NotificationTemplateEntity } from '../notification-template';
import { SubscriberEntity } from '../subscriber';
import { NotificationEntity } from '../notification';
import { EnvironmentEntity } from '../environment';
import { ChannelTypeEnum, StepTypeEnum, PeriodicityEnum } from '@novu/shared';
import type { EnforceEnvOrOrgIds } from '../../types/enforce';
import { DalException } from '../../shared';

type JobEntityPopulated = JobEntity & {
  template: NotificationTemplateEntity;
  notification: NotificationEntity;
  subscriber: SubscriberEntity;
  environment: EnvironmentEntity;
};

type FeedFilterQuery = {
  channels?: ChannelTypeEnum[] | null;
  templates?: string[] | null;
  subscriberIds?: string[];
  transactionId?: string;
  startDate?: Date;
  endDate?: Date;
  periodicity?: PeriodicityEnum;
};

export class JobRepository extends BaseRepository<JobDBModel, JobEntity, EnforceEnvOrOrgIds> {
  constructor() {
    super(Job, JobEntity);
  }

  public async storeJobs(jobs: Omit<JobEntity, '_id' | 'createdAt' | 'updatedAt'>[]): Promise<JobEntity[]> {
    const stored: JobEntity[] = [];
    for (let index = 0; index < jobs.length; index++) {
      if (index > 0) {
        jobs[index]._parentId = stored[index - 1]._id;
      }

      const created = await this.create(jobs[index]);
      stored.push(created);
    }

    return stored;
  }

  public async updateStatus(
    organizationId: string,
    jobId: string,
    status: JobStatusEnum
  ): Promise<{ matched: number; modified: number }> {
    return await this.update(
      {
        _organizationId: organizationId,
        _id: jobId,
      },
      {
        $set: {
          status,
        },
      }
    );
  }

  public async setError(organizationId: string, jobId: string, error: Error): Promise<void> {
    const result = await this._model.update(
      {
        _organizationId: this.convertStringToObjectId(organizationId),
        _id: this.convertStringToObjectId(jobId),
      },
      {
        $set: {
          error,
        },
      }
    );

    if (result.modifiedCount === 0) {
      throw new DalException(
        `There was a problem when trying to set an error for the job ${jobId} in the organization ${organizationId}`
      );
    }
  }

  public async findOnePopulate({
    query,
    select = '',
    selectTemplate = '',
    selectNotification = '',
    selectSubscriber = '',
    selectEnvironment = '',
  }: {
    query: { _environmentId: string; transactionId: string };
    select?: ProjectionType<JobEntity>;
    selectTemplate?: ProjectionType<NotificationTemplateEntity>;
    selectNotification?: ProjectionType<NotificationEntity>;
    selectSubscriber?: ProjectionType<SubscriberEntity>;
    selectEnvironment?: ProjectionType<EnvironmentEntity>;
  }) {
    const job = this.MongooseModel.findOne(query, select)
      .populate('template', selectTemplate)
      .populate('notification', selectNotification)
      .populate('subscriber', selectSubscriber)
      .populate('environment', selectEnvironment)
      .lean()
      .exec();

    return job as unknown as JobEntityPopulated;
  }

  async getActivityGraphStats(environmentId: string, query: FeedFilterQuery) {
    const requestQuery = this.createFilterQuery(environmentId, query);
    if (!requestQuery.type) requestQuery.type = { $nin: ['trigger', StepTypeEnum.DELAY, StepTypeEnum.DIGEST] };
    const group: any = { type: '$type', year: { $year: '$createdAt' } };
    if (query.periodicity === PeriodicityEnum.MONTHLY) group.month = { $month: '$createdAt' };
    else if (query.periodicity === PeriodicityEnum.WEEKLY) group.week = { $week: '$createdAt' };
    else group.day = { $dayOfYear: '$createdAt' };

    return await this.aggregate([
      { $match: requestQuery },
      {
        $group: { _id: group, count: { $sum: 1 } },
      },
    ]);
  }

  private createFilterQuery(environmentId: string, query: FeedFilterQuery = {}) {
    const requestQuery: FilterQuery<JobDBModel> = {
      _environmentId: this.convertStringToObjectId(environmentId),
    };
    if (query.transactionId) requestQuery.transactionId = query.transactionId;
    if (query?.templates) {
      requestQuery._templateId = {
        $in: query.templates,
      };
    }
    if (query.subscriberIds && query.subscriberIds.length > 0) {
      requestQuery._subscriberId = {
        $in: query.subscriberIds.map((subId) => this.convertStringToObjectId(subId)),
      };
    }
    if (query.startDate) requestQuery.createdAt = { $gte: query.startDate, $lte: query.endDate };
    if (query?.channels) {
      requestQuery.type = {
        $in: query.channels,
      };
    }

    return requestQuery;
  }

  async getFeed(environmentId: string, query: FeedFilterQuery = {}, skip = 0, limit = 10) {
    {
      const requestQuery = this.createFilterQuery(environmentId, query);
      //this line can be removed after trigger jobs cleared from db
      if (!requestQuery.type) requestQuery.type = { $nin: ['trigger'] };
      const totalCount = await this.getTotalCount(requestQuery);
      const response = await this.MongooseModel.aggregate([
        { $match: requestQuery },
        {
          $group: {
            _id: {
              _notificationId: '$_notificationId',
              transactionId: '$transactionId',
              templateId: { $toObjectId: '$_templateId' },
              _subscriberId: '$_subscriberId',
            },
            createdAt: { $min: '$createdAt' },
            jobs: {
              $push: {
                _id: {
                  $toString: '$_id',
                },
                type: '$type',
                status: '$status',
                delay: '$delay',
                digestCount: {
                  $cond: {
                    if: { $isArray: '$digestedNotificationIds' },
                    then: { $size: '$digestedNotificationIds' },
                    else: 0,
                  },
                },
              },
            },
          },
        },
        {
          $sort: { createdAt: -1 },
        },
        { $skip: skip },
        { $limit: limit },

        {
          $lookup: {
            from: 'notificationtemplates',
            localField: '_id.templateId',
            foreignField: '_id',
            pipeline: [{ $project: { name: 1 } }],
            as: 'template',
          },
        },

        {
          $lookup: {
            from: 'executiondetails',
            localField: '_id._notificationId',
            foreignField: '_notificationId',
            pipeline: [{ $project: { _jobId: 1, detail: 1, _id: 0 } }],
            as: 'executionDetails',
          },
        },
        {
          $project: {
            _id: 0,
            createdAt: 1,
            template: { $first: '$template' },
            id: '$_id._notificationId',
            transactionId: '$_id.transactionId',
            _subscriberId: '$_id._subscriberId',
            jobs: {
              $map: {
                input: '$jobs',
                as: 'job',
                in: {
                  _id: '$$job._id',
                  digestCount: '$$job.digestCount',
                  type: '$$job.type',
                  status: '$$job.status',
                  delay: '$$job.delay',
                  executionDetails: {
                    $slice: [
                      {
                        $filter: {
                          input: '$executionDetails',
                          as: 'detail',
                          cond: { $eq: ['$$detail._jobId', '$$job._id'] },
                        },
                      },
                      -1,
                    ],
                  },
                },
              },
            },
          },
        },
      ]);

      return {
        totalCount,
        data: this.mapEntities(response),
      };
    }
  }

  public async getFeedItem(notificationId: string, environmentId: string, organizationId: string) {
    const requestQuery: FilterQuery<JobDBModel> = {
      _environmentId: this.convertStringToObjectId(environmentId),
      _organizationId: this.convertStringToObjectId(organizationId),
      _notificationId: this.convertStringToObjectId(notificationId),
    };
    const feedItem = await this.aggregate([
      { $match: requestQuery },
      {
        $group: {
          _id: {
            _notificationId: '$_notificationId',
            transactionId: '$transactionId',
            templateId: { $toObjectId: '$_templateId' },
            subscriberId: '$_subscriberId',
          },
          createdAt: { $min: '$createdAt' },
          jobs: {
            $push: '$$ROOT',
          },
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $lookup: {
          from: 'notificationtemplates',
          localField: '_id.templateId',
          foreignField: '_id',
          as: 'template',
        },
      },
      {
        $lookup: {
          from: 'subscribers',
          localField: '_id.subscriberId',
          foreignField: '_id',
          pipeline: [{ $project: { firstName: 1, _id: 1, lastName: 1, email: 1, phone: 1 } }],
          as: 'subscriber',
        },
      },
      {
        $lookup: {
          from: 'executiondetails',
          localField: '_id._notificationId',
          foreignField: '_notificationId',
          pipeline: [
            {
              $project: {
                _jobId: 1,
                id: '$_id',
                _id: 0,
                createdAt: 1,
                detail: 1,
                isRetry: 1,
                isTest: 1,
                providerId: 1,
                raw: 1,
                source: 1,
                status: 1,
                updatedAt: 1,
                webhookStatus: 1,
              },
            },
          ],
          as: 'executionDetails',
        },
      },
      {
        $project: {
          _id: 0,
          createdAt: 1,
          id: '$_id._notificationId',
          transactionId: '$_id.transactionId',
          template: { $first: '$template' },
          subscriber: { $first: '$subscriber' },
          jobs: {
            $map: {
              input: '$jobs',
              as: 'job',
              in: {
                id: '$$job._id',
                type: '$$job.type',
                status: '$$job.status',
                digest: '$$job.digest',
                payload: '$$job.payload',
                overrides: '$$job.overrides',
                to: '$$job.to',
                providerId: '$$job.providerId',
                delay: '$$job.delay',
                createdAt: '$$job.createdAt',
                updatedAt: '$$job.updatedAt',
                step: '$$job.step',
                executionDetails: {
                  $filter: {
                    input: '$executionDetails',
                    as: 'detail',
                    cond: { $eq: ['$$detail._jobId', { $toString: '$$job._id' }] },
                  },
                },
                digestCount: {
                  $cond: {
                    if: { $isArray: '$$job.digestedNotificationIds' },
                    then: { $size: '$$job.digestedNotificationIds' },
                    else: 0,
                  },
                },
              },
            },
          },
        },
      },
    ]);

    return feedItem?.[0];
  }

  private async getTotalCount(requestQuery) {
    const count = await this.aggregate([
      { $match: requestQuery },
      {
        $group: {
          _id: '$_notificationId',
        },
      },
      {
        $count: 'totalCount',
      },
    ]);

    return count?.[0]?.totalCount ? count[0].totalCount : 0;
  }

  /*
   *base command not liking this, messing up data completely, it is randomly changing data
   *not sure if this is known issue, wasted lot of time.. need to do more research
   *public async findByIdPayloadPopulated(id: string, select?: string) {
   *  return Job.findById(id, select).populate('digestedPayload', 'payload').lean().exec();
   *}
   */
}
