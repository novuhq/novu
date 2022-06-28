import { BaseRepository } from '../base-repository';
import { JobEntity, JobStatusEnum } from './job.entity';
import { Job } from './job.schema';

export class JobRepository extends BaseRepository<JobEntity> {
  constructor() {
    super(Job, JobEntity);
  }

  public async storeJobs(jobs: JobEntity[]): Promise<JobEntity> {
    const stored = [];
    for (let index = 0; index < jobs.length; index++) {
      if (index > 0) {
        jobs[index]._parentId = stored[index - 1]._id;
      }

      const created = await this.create(jobs[index]);
      stored.push(created);
    }

    return stored[0];
  }

  public async updateStatus(jobId: string, status: JobStatusEnum) {
    await this.update(
      {
        _id: jobId,
      },
      {
        $set: {
          status,
        },
      }
    );
  }

  public async setError(jobId: string, error: Error) {
    await this.update(
      {
        _id: jobId,
      },
      {
        $set: {
          error,
        },
      }
    );
  }

  public async findJobsToDigest(from: Date, identifier: string, environmentId: string, subscriberId: string) {
    return await this.find({
      updatedAt: {
        $gte: from,
      },
      status: JobStatusEnum.COMPLETED,
      identifier: identifier,
      _environmentId: environmentId,
      _subscriberId: subscriberId,
    });
  }
}
