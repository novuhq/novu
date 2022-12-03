import { BaseRepository, Omit } from '../base-repository';
import { JobEntity, JobStatusEnum } from './job.entity';
import { Job } from './job.schema';
import { ChannelTypeEnum, StepTypeEnum } from '@novu/shared';
import { Document, FilterQuery } from 'mongoose';

class PartialIntegrationEntity extends Omit(JobEntity, ['_environmentId', '_organizationId']) {}

type EnforceEnvironmentQuery = FilterQuery<PartialIntegrationEntity & Document> &
  ({ _environmentId: string } | { _organizationId: string });

export class JobRepository extends BaseRepository<EnforceEnvironmentQuery, JobEntity> {
  constructor() {
    super(Job, JobEntity);
  }

  public async storeJobs(jobs: JobEntity[]): Promise<JobEntity[]> {
    const stored = [];
    for (let index = 0; index < jobs.length; index++) {
      if (index > 0) {
        jobs[index]._parentId = stored[index - 1]._id;
      }

      const created = await this.create(jobs[index]);
      stored.push(created);
    }

    return stored;
  }

  public async updateStatus(organizationId: string, jobId: string, status: JobStatusEnum) {
    await this.update(
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

  public async setError(organizationId: string, jobId: string, error: Error) {
    await this.update(
      {
        _organizationId: organizationId,
        _id: jobId,
      },
      {
        $set: {
          error,
        },
      }
    );
  }

  public async findInAppsForDigest(organizationId: string, transactionId: string, subscriberId: string) {
    return await this.find({
      _organizationId: organizationId,
      type: ChannelTypeEnum.IN_APP,
      _subscriberId: subscriberId,
      transactionId,
    });
  }

  public async findJobsToDigest(from: Date, templateId: string, environmentId: string, subscriberId: string) {
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
}
