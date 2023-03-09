import { ProjectionType } from 'mongoose';

import { BaseRepository } from '../base-repository';
import { JobEntity, JobDBModel, JobStatusEnum } from './job.entity';
import { Job } from './job.schema';
import { NotificationTemplateEntity } from '../notification-template';
import { SubscriberEntity } from '../subscriber';
import { NotificationEntity } from '../notification';
import { EnvironmentEntity } from '../environment';
import type { EnforceEnvOrOrgIds } from '../../types/enforce';
import { DalException } from '../../shared';

type JobEntityPopulated = JobEntity & {
  template: NotificationTemplateEntity;
  notification: NotificationEntity;
  subscriber: SubscriberEntity;
  environment: EnvironmentEntity;
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

  /*
   *base command not liking this, messing up data completely, it is randomly changing data
   *not sure if this is known issue, wasted lot of time.. need to do more research
   *public async findByIdPayloadPopulated(id: string, select?: string) {
   *  return Job.findById(id, select).populate('digestedPayload', 'payload').lean().exec();
   *}
   */
}
