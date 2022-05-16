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
}
