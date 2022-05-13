import { BaseRepository } from '../base-repository';
import { JobEntity, JobStatus } from './job.entity';
import { Job } from './job.schema';

export class JobRepository extends BaseRepository<JobEntity> {
  constructor() {
    super(Job, JobEntity);
  }

  public async storeJobs(jobs: JobEntity[]): Promise<JobEntity> {
    jobs = jobs
      .map((job: JobEntity) => {
        job._id = JobRepository.createObjectId();

        return job;
      })
      .map((job: JobEntity, index: number, list: JobEntity[]) => {
        if (index === 0) {
          return job;
        }
        job._parentId = list[index - 1]._id;

        return job;
      });

    const stored = [];

    for (const job of jobs) {
      const created = await this.create(job);
      stored.push(created);
    }

    return stored[0];
  }

  public async updateStatus(jobId: string, status: JobStatus) {
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
