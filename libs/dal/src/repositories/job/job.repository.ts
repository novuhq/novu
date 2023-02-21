import { BaseRepository, Omit } from '../base-repository';
import { JobEntity, JobStatusEnum } from './job.entity';
import { Job } from './job.schema';
import { Document, FilterQuery, ProjectionType } from 'mongoose';
import { NotificationTemplateEntity } from '../notification-template';
import { SubscriberEntity } from '../subscriber';
import { NotificationEntity } from '../notification';
import { EnvironmentEntity } from '../environment';

class PartialJobEntity extends Omit(JobEntity, ['_environmentId', '_organizationId']) {}

type EnforceEnvironmentQuery = FilterQuery<PartialJobEntity & Document> &
  ({ _id: string } | { _environmentId: string } | { _organizationId: string });

export class JobRepository extends BaseRepository<EnforceEnvironmentQuery, JobEntity> {
  constructor() {
    super(Job, JobEntity);
  }

  public async storeJobs(jobs: Omit<JobEntity, '_id'>[]): Promise<JobEntity[]> {
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
  }): Promise<
    JobEntity & {
      template: NotificationTemplateEntity;
      notification: NotificationEntity;
      subscriber: SubscriberEntity;
      environment: EnvironmentEntity;
    }
  > {
    return this.MongooseModel.findOne(query, select)
      .populate('template', selectTemplate)
      .populate('notification', selectNotification)
      .populate('subscriber', selectSubscriber)
      .populate('environment', selectEnvironment)
      .lean()
      .exec();
  }
  /*
   *base command not liking this, messing up data completely, it is randomly changing data
   *not sure if this is known issue, wasted lot of time.. need to do more research
   *public async findByIdPayloadPopulated(id: string, select?: string) {
   *  return Job.findById(id, select).populate('digestedPayload', 'payload').lean().exec();
   *}
   */
}
