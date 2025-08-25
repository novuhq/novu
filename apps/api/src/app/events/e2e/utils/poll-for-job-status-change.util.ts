import { JobEntity, JobRepository, JobStatusEnum } from '@novu/dal';
import { sleep } from './sleep.util';

type EnforceEnvOrOrgIds = { _environmentId: string } | { _organizationId: string };

interface IPollForJobOptions {
  jobRepository: JobRepository;
  query: Partial<JobEntity> & EnforceEnvOrOrgIds;
  timeout?: number;
  pollInterval?: number;
}

// Function overloads to make return type conditional based on findMultiple
export async function pollForJobStatusChange(
  options: IPollForJobOptions & { findMultiple: true }
): Promise<JobEntity[] | null>;

export async function pollForJobStatusChange(
  options: IPollForJobOptions & { findMultiple?: false }
): Promise<JobEntity | null>;

export async function pollForJobStatusChange({
  jobRepository,
  query,
  timeout = 5000,
  pollInterval = 100,
  findMultiple = false,
}: IPollForJobOptions & { findMultiple?: boolean }): Promise<JobEntity | JobEntity[] | null> {
  const startTime = Date.now();

  while (true) {
    if (findMultiple) {
      const jobs = await jobRepository.find(query);

      if (jobs.length > 0 && jobs.every((job: JobEntity) => job.status !== JobStatusEnum.PENDING)) {
        return jobs;
      }
    } else {
      const job = await jobRepository.findOne(query);

      if (job && job.status !== JobStatusEnum.PENDING) {
        return job;
      }
    }

    if (Date.now() - startTime > timeout) {
      return findMultiple ? ([] as JobEntity[]) : null;
    }

    await sleep(pollInterval);
  }
}
