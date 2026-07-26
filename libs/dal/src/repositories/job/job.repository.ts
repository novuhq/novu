import {
  DeliveryLifecycleDetail,
  DeliveryLifecycleStatusEnum,
  DigestCreationResultEnum,
  IDigestBaseMetadata,
  IDigestRegularMetadata,
  StepTypeEnum,
} from '@novu/shared';
import { sub } from 'date-fns';
import { ProjectionType } from 'mongoose';
import { DalException } from '../../shared';
import type { EnforceEnvOrOrgIds } from '../../types';
import { BaseRepository } from '../base-repository';
import { EnvironmentEntity } from '../environment';
import { NotificationEntity } from '../notification';
import { NotificationTemplateEntity } from '../notification-template';
import { SubscriberEntity } from '../subscriber';
import { DeliveryLifecycleState, JobDBModel, JobEntity, JobStatusEnum } from './job.entity';
import { Job } from './job.schema';

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

/**
 * Lease TTL for {@link JobRepository.claimAsRunning}. Must stay below BullMQ lock / SQS visibility (90s).
 * Live workers renew the lease via {@link JobRepository.renewRunningClaim} while executing, so a stale
 * lease always means the claiming worker died — not that the job is merely slow.
 */
export const RUNNING_CLAIM_STALE_AFTER_MS = 60_000;

/** Heartbeat period for renewing a RUNNING claim; several renewals fit within one lease TTL. */
export const RUNNING_CLAIM_RENEW_INTERVAL_MS = RUNNING_CLAIM_STALE_AFTER_MS / 3;

export class JobRepository extends BaseRepository<JobDBModel, JobEntity, EnforceEnvOrOrgIds> {
  constructor() {
    super(Job, JobEntity);
  }

  public async storeJobs(jobs: Omit<JobEntity, '_id' | 'createdAt' | 'updatedAt'>[]): Promise<JobEntity[]> {
    const stored: JobEntity[] = [];
    for (let index = 0; index < jobs.length; index += 1) {
      if (index > 0) {
        jobs[index]._parentId = stored[index - 1]._id;
      }

      const created = new this.MongooseModel({ ...jobs[index], createdAt: Date.now() });

      stored.push(this.mapEntity(created));
    }

    await this.insertMany(stored, true);

    return stored;
  }

  public async updateStatus(
    environmentId: string,
    jobId: string,
    status: JobStatusEnum,
    deliveryLifecycleState?: DeliveryLifecycleState
  ): Promise<JobEntity | null> {
    return this.MongooseModel.findOneAndUpdate(
      {
        _environmentId: environmentId,
        _id: jobId,
      },
      {
        $set: {
          status,
          deliveryLifecycleState,
        },
      },
      { new: true }
    );
  }

  /**
   * Atomically claim a job for execution (QUEUED|DELAYED -> RUNNING, or stale RUNNING).
   * Returns null when another worker holds a live lease or the job is already terminal.
   */
  public async claimAsRunning(environmentId: string, jobId: string): Promise<JobEntity | null> {
    const staleClaimCutoff = new Date(Date.now() - RUNNING_CLAIM_STALE_AFTER_MS);

    return this.findOneAndUpdate(
      {
        _environmentId: environmentId,
        _id: jobId,
        $or: [
          { status: { $in: [JobStatusEnum.QUEUED, JobStatusEnum.DELAYED] } },
          { status: JobStatusEnum.RUNNING, updatedAt: { $lte: staleClaimCutoff } },
        ],
      },
      {
        $set: {
          status: JobStatusEnum.RUNNING,
        },
      },
      { new: true }
    );
  }

  /**
   * Renew a live RUNNING claim's lease (schema timestamps refresh `updatedAt` on write).
   * No-op once the job has left RUNNING, so a late heartbeat can never resurrect a claim.
   */
  public async renewRunningClaim(environmentId: string, jobId: string): Promise<void> {
    await this.updateOne(
      {
        _environmentId: environmentId,
        _id: jobId,
        status: JobStatusEnum.RUNNING,
      },
      {
        $set: {
          status: JobStatusEnum.RUNNING,
        },
      }
    );
  }

  /** Release RUNNING -> QUEUED so a short-delay retry (e.g. webhook filter) can reclaim. */
  public async releaseRunningClaim(environmentId: string, jobId: string): Promise<void> {
    await this.updateOne(
      {
        _environmentId: environmentId,
        _id: jobId,
        status: JobStatusEnum.RUNNING,
      },
      {
        $set: {
          status: JobStatusEnum.QUEUED,
        },
      }
    );
  }

  /** Atomically claim the next PENDING child as QUEUED so a redelivered parent cannot re-enqueue it. */
  public async claimNextChildAsQueued(environmentId: string, parentJobId: string): Promise<JobEntity | null> {
    return this.findOneAndUpdate(
      {
        _environmentId: environmentId,
        _parentId: parentJobId,
        status: JobStatusEnum.PENDING,
      },
      {
        $set: {
          status: JobStatusEnum.QUEUED,
        },
      },
      { new: true }
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

  /**
   * The single "completed TRIGGER jobs for this digest value" primitive shared
   * by the regular ({@link findJobsToDigest}) and backoff digest event
   * collection paths.
   *
   * Payload-dedup: trigger jobs may no longer carry a payload, so the digest
   * value is matched against the value persisted on each transaction's sibling
   * DIGEST job (`digest.digestValue`) rather than `payload.${digestKey}`. When
   * no transaction matches, returns `[]` explicitly (no accidental `$in: []`).
   */
  public async findDigestEventTriggers(params: {
    window: { field: 'createdAt' | 'updatedAt'; from: Date };
    templateId: string;
    environmentId: string;
    subscriberId: string;
    digestKey?: string;
    digestValue?: string | number;
    excludeTransactionIds?: string[];
  }): Promise<JobEntity[]> {
    const {
      window,
      templateId,
      environmentId,
      subscriberId,
      digestKey,
      digestValue,
      excludeTransactionIds = [],
    } = params;

    const windowFilter =
      window.field === 'updatedAt' ? { updatedAt: { $gte: window.from } } : { createdAt: { $gte: window.from } };

    let matchingTransactionIds: string[] | undefined;
    if (digestKey) {
      const matchingDigestJobs = await this.find(
        {
          ...windowFilter,
          _templateId: templateId,
          type: StepTypeEnum.DIGEST,
          _environmentId: environmentId,
          _subscriberId: subscriberId,
          // Payload-dedup jobs persist `digest.digestValue`; legacy digest jobs
          // (created before it was persisted) still carry the trigger payload,
          // so fall back to matching the value inside it. Without this, legacy
          // events queued before deployment would be dropped from the window.
          $or: [{ 'digest.digestValue': digestValue }, { [`payload.${digestKey}`]: digestValue }],
        },
        'transactionId'
      );

      matchingTransactionIds = [...new Set(matchingDigestJobs.map((job) => job.transactionId))].filter(
        (transactionId) => !excludeTransactionIds.includes(transactionId)
      );

      if (matchingTransactionIds.length === 0) {
        return [];
      }
    }

    return this.find(
      {
        ...windowFilter,
        _templateId: templateId,
        status: JobStatusEnum.COMPLETED,
        type: StepTypeEnum.TRIGGER,
        _environmentId: environmentId,
        _subscriberId: subscriberId,
        transactionId: {
          $nin: excludeTransactionIds,
          ...(matchingTransactionIds ? { $in: matchingTransactionIds } : {}),
        },
      },
      // Only what downstream consumers need: buildDigestEvent (event refs) and
      // findJobsToDigest's completion update (transactionId).
      '_id payload _notificationId createdAt transactionId'
    );
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
    const excludeTransactionIds = digests.map((job) => job.transactionId);

    const result = await this.findDigestEventTriggers({
      window: { field: 'updatedAt', from },
      templateId,
      environmentId,
      subscriberId,
      digestKey,
      digestValue,
      excludeTransactionIds,
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
      /*
       * QUEUED covers the window between claimNextChildAsQueued and the
       * merge/skip decision in AddJob — without it, two concurrent triggers
       * with the same digest value are invisible to each other's backoff
       * check and both skip the digest.
       */
      status: { $in: [JobStatusEnum.PENDING, JobStatusEnum.QUEUED, JobStatusEnum.SKIPPED, JobStatusEnum.COMPLETED] },
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
  }): Promise<JobEntity[]> {
    const pendingJobs = await this.find({
      _environmentId,
      _subscriberId,
      _templateId,
      status: JobStatusEnum.PENDING,
      transactionId,
    });

    if (pendingJobs.length === 0) {
      return [];
    }

    await this.MongooseModel.updateMany(
      { _id: { $in: pendingJobs.map((job) => job._id) } },
      {
        $set: {
          status: JobStatusEnum.CANCELED,
          deliveryLifecycleState: {
            status: DeliveryLifecycleStatusEnum.CANCELED,
            detail: DeliveryLifecycleDetail.EXECUTION_STOPPED,
          },
        },
      }
    );

    return pendingJobs;
  }
}
