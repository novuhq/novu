import { ProjectionType } from 'mongoose';
import { DigestTypeEnum, IDigestRegularMetadata, StepTypeEnum, DigestCreationResultEnum } from '@novu/shared';

import { BaseRepository } from '../base-repository';
import { JobEntity, JobDBModel, JobStatusEnum } from './job.entity';
import { Job } from './job.schema';
import { NotificationTemplateEntity } from '../notification-template';
import { SubscriberEntity } from '../subscriber';
import { NotificationEntity } from '../notification';
import { EnvironmentEntity } from '../environment';
import type { EnforceEnvOrOrgIds, IUpdateResult } from '../../types';
import { DalException } from '../../shared';
import { sub, isBefore } from 'date-fns';

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
    for (let index = 0; index < jobs.length; index++) {
      if (index > 0) {
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

  public async shouldDelayDigestJobOrMerge(
    job: JobEntity,
    digestKey?: string,
    digestValue?: string | number,
    digestMeta?: IDigestRegularMetadata
  ): Promise<IDelayOrDigestJobResult> {
    const isBackoff = job.digest?.type === DigestTypeEnum.BACKOFF || (job.digest as IDigestRegularMetadata)?.backoff;
    if (isBackoff) {
      const trigger = await this.getTrigger(job, digestMeta, digestKey, digestValue);
      if (!trigger) {
        return {
          digestResult: DigestCreationResultEnum.SKIPPED,
        };
      }

      /**
       * In case of 2 triggers happened concurrently,
       * we want only one of those jobs to be skipped, while the second to be creating a digest.
       * This is an issue, since we are relying on the Trigger job existence,
       * that is created earlier in the workflow execution.
       */
      const lockedPriorityJob = isBefore(new Date(job.createdAt), new Date(trigger.createdAt));
      if (lockedPriorityJob) {
        return {
          digestResult: DigestCreationResultEnum.SKIPPED,
        };
      }
    }

    const delayedDigestJob = await this._model.findOne(
      {
        status: JobStatusEnum.DELAYED,
        type: StepTypeEnum.DIGEST,
        _templateId: job._templateId,
        _environmentId: this.convertStringToObjectId(job._environmentId),
        _subscriberId: this.convertStringToObjectId(job._subscriberId),
        ...(digestKey && { [`payload.${digestKey}`]: digestValue }),
      },
      '_id _notificationId'
    );

    if (!delayedDigestJob) {
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

      return {
        activeDigestId: job._id,
        digestResult: DigestCreationResultEnum.CREATED,
      };
    }

    return {
      activeDigestId: delayedDigestJob._id,
      activeNotificationId: delayedDigestJob._notificationId?.toString(),
      digestResult: DigestCreationResultEnum.MERGED,
    };
  }

  private getBackoffDate(metadata: IDigestRegularMetadata | undefined) {
    return sub(new Date(), {
      [metadata?.backoffUnit as string]: metadata?.backoffAmount,
    });
  }

  private getTrigger(
    job: JobEntity,
    metadata?: IDigestRegularMetadata,
    digestKey?: string,
    digestValue?: string | number
  ) {
    const query = {
      updatedAt: {
        $gte: this.getBackoffDate(metadata),
      },
      _notificationId: {
        $ne: job._notificationId,
      },
      _templateId: job._templateId,
      status: JobStatusEnum.COMPLETED,
      type: StepTypeEnum.TRIGGER,
      _environmentId: job._environmentId,
      _subscriberId: job._subscriberId,
      ...(digestKey && { [`payload.${digestKey}`]: digestValue }),
    };

    return this.findOne(query);
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
}
