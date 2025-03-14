import { ProjectionType } from 'mongoose';
import { DigestCreationResultEnum, IDigestBaseMetadata, IDigestRegularMetadata, StepTypeEnum } from '@novu/shared';

import { sub } from 'date-fns';
import { BaseRepository } from '../base-repository';
import { JobDBModel, JobEntity, JobStatusEnum } from './job.entity';
import { Job } from './job.schema';
import { NotificationTemplateEntity } from '../notification-template';
import { SubscriberEntity } from '../subscriber';
import { NotificationEntity } from '../notification';
import { EnvironmentEntity } from '../environment';
import type { EnforceEnvOrOrgIds, IUpdateResult } from '../../types';
import { DalException } from '../../shared';

type JobEntityPopulated = JobEntity & {
  template: NotificationTemplateEntity;
  notification: NotificationEntity;
  subscriber: SubscriberEntity;
  environment: EnvironmentEntity;
};

export interface IDelayOrDigestJobResult {
  digestResult: DigestCreationResultEnum;
  activeDigestId?: string;
  activeNotificationId?: string;
}

export class JobRepository extends BaseRepository<JobDBModel, JobEntity, EnforceEnvOrOrgIds> {
  constructor() {
    super(Job, JobEntity);
  }

  public async storeJobs(jobs: Omit<JobEntity, '_id' | 'createdAt' | 'updatedAt'>[]): Promise<JobEntity[]> {
    const stored: JobEntity[] = [];
    for (let index = 0; index < jobs.length; index += 1) {
      if (index > 0) {
        // eslint-disable-next-line no-param-reassign
        jobs[index]._parentId = stored[index - 1]._id;
      }

      const created = new this.MongooseModel({ ...jobs[index], createdAt: Date.now() });

      stored.push(this.mapEntity(created));
    }

    await this.insertMany(stored, true);

    return stored;
  }

  public async updateStatus(environmentId: string, jobId: string, status: JobStatusEnum): Promise<IUpdateResult> {
    return this.MongooseModel.updateOne(
      {
        _environmentId: environmentId,
        _id: jobId,
      },
      {
        $set: {
          status,
        },
      }
    );
  }

  public async setError(organizationId: string, jobId: string, error: any): Promise<void> {
    const result = await this._model.updateOne(
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

  public async findJobsToDigest(
    from: Date,
    templateId: string,
    environmentId: string,
    subscriberId: string,
    digestKey?: string,
    digestValue?: string | number
  ) {
    /**
     * Remove digest jobs that have been completed and currently delayed jobs that have a digest pending.
     */
    const digests = await this.find({
      updatedAt: {
        $gte: from,
      },
      _templateId: templateId,
      $or: [
        { status: JobStatusEnum.COMPLETED, type: StepTypeEnum.DIGEST },
        { status: JobStatusEnum.DELAYED, type: StepTypeEnum.DELAY },
      ],
      _environmentId: environmentId,
      _subscriberId: subscriberId,
    });
    const transactionIds = digests.map((job) => job.transactionId);

    const result = await this.find({
      updatedAt: {
        $gte: from,
      },
      _templateId: templateId,
      status: JobStatusEnum.COMPLETED,
      type: StepTypeEnum.TRIGGER,
      _environmentId: environmentId,
      _subscriberId: subscriberId,
      ...(digestKey && { [`payload.${digestKey}`]: digestValue }),
      transactionId: {
        $nin: transactionIds,
      },
    });

    const transactionIdsTriggers = result.map((job) => job.transactionId);

    /**
     * Update events that have been digested (events that have been sent) to be of status completed.
     * To avoid cases of same events being sent multiple times.
     * Happens in cases of delay followed by digest
     */
    await this.update(
      {
        updatedAt: {
          $gte: from,
        },
        _templateId: templateId,
        status: JobStatusEnum.PENDING,
        type: StepTypeEnum.DIGEST,
        _environmentId: environmentId,
        _subscriberId: subscriberId,
        transactionId: {
          $in: transactionIdsTriggers,
        },
      },
      {
        $set: {
          status: JobStatusEnum.COMPLETED,
        },
      }
    );

    return result;
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

  public async markJobAsDigestMaster(job: JobEntity) {
    await this._model.updateOne(
      {
        _environmentId: job._environmentId,
        _templateId: job._templateId,
        _subscriberId: job._subscriberId,
        _id: job._id,
      },
      {
        $set: {
          status: JobStatusEnum.DELAYED,
        },
      }
    );
  }

  public async getExistingDelayedJobWithTheSameDigestValue(job: JobEntity, digestMeta?: IDigestBaseMetadata) {
    const findOne = await this._model.findOne(
      {
        status: JobStatusEnum.DELAYED,
        type: StepTypeEnum.DIGEST,
        _templateId: job._templateId,
        _environmentId: this.convertStringToObjectId(job._environmentId),
        _subscriberId: this.convertStringToObjectId(job._subscriberId),
        'digest.digestValue': digestMeta?.digestValue,
      },
      '_id _notificationId'
    );

    return findOne != null ? { _id: findOne._id, _notificationId: findOne._notificationId } : null;
  }

  private getBackoffDate(metadata: IDigestRegularMetadata | undefined) {
    return sub(new Date(), {
      [metadata?.backoffUnit as string]: metadata?.backoffAmount,
    });
  }

  public async getAnotherJobTriggeredWithinBackoffTime(
    job: JobEntity,
    metadata?: IDigestRegularMetadata | undefined
  ): Promise<JobEntity[] | undefined> {
    const otherDigestJobsWithSameDigestKeyValue = await this.find(this.buildLookBackDigestQuery(metadata, job));

    return await this.find({
      status: JobStatusEnum.COMPLETED,
      type: StepTypeEnum.TRIGGER,
      _organizationId: job._organizationId,
      transactionId: { $in: otherDigestJobsWithSameDigestKeyValue.map((job1) => job1.transactionId) },
    });
  }
  private buildLookBackDigestQuery(metadata: IDigestRegularMetadata | undefined, job: JobEntity) {
    return {
      createdAt: {
        $gte: this.getBackoffDate(metadata),
      },
      _notificationId: {
        $ne: job._notificationId,
      },
      _templateId: job._templateId,
      status: { $in: [JobStatusEnum.PENDING, JobStatusEnum.SKIPPED, JobStatusEnum.COMPLETED] },
      type: StepTypeEnum.DIGEST,
      _environmentId: job._environmentId,
      _subscriberId: job._subscriberId,
      'digest.digestValue': metadata?.digestValue,
    };
  }

  async updateAllChildJobStatus(job: JobEntity, status: JobStatusEnum, activeDigestId: string): Promise<JobEntity[]> {
    const updatedJobs: JobEntity[] = [];

    let childJob: JobEntity | null = await this.MongooseModel.findOneAndUpdate<JobEntity>(
      {
        _environmentId: job._environmentId,
        _parentId: job._id,
      },
      {
        $set: {
          status,
          _mergedDigestId: activeDigestId,
        },
      }
    );

    if (childJob) {
      updatedJobs.push(childJob);
    }

    while (childJob) {
      childJob = await this.MongooseModel.findOneAndUpdate<JobEntity>(
        {
          _environmentId: job._environmentId,
          _parentId: childJob._id,
        },
        {
          $set: {
            status,
            _mergedDigestId: activeDigestId,
          },
        }
      );

      if (childJob) {
        updatedJobs.push(childJob);
      }
    }

    return updatedJobs;
  }

  public async cancelPendingJobs({
    _environmentId,
    transactionId,
    _subscriberId,
    _templateId,
  }: {
    _environmentId: string;
    transactionId: string;
    _subscriberId: string;
    _templateId: string;
  }): Promise<IUpdateResult> {
    return this.MongooseModel.updateMany(
      {
        _environmentId,
        _subscriberId,
        _templateId,
        status: JobStatusEnum.PENDING,
        transactionId,
      },
      {
        $set: {
          status: JobStatusEnum.CANCELED,
        },
      }
    );
  }
}
