import { JobEntity, JobRepository, JobStatusEnum } from '@novu/dal';
import { sleep } from './sleep.util';

type EnforceEnvOrOrgIds = { _environmentId: string } | { _organizationId: string };

interface IPollForJobOptions {
  jobRepository: JobRepository;
  query: Partial<JobEntity> & EnforceEnvOrOrgIds;
  timeout?: number;
  pollInterval?: number;
  expectedCount?: number;
  until?: (jobs: JobEntity[]) => boolean;
}

function areJobsReady(jobs: JobEntity[], expectedCount?: number, until?: (jobs: JobEntity[]) => boolean): boolean {
  if (jobs.length === 0) {
    return false;
  }

  if (expectedCount !== undefined && jobs.length !== expectedCount) {
    return false;
  }

  if (!jobs.every((job: JobEntity) => job.status !== JobStatusEnum.PENDING)) {
    return false;
  }

  if (until && !until(jobs)) {
    return false;
  }

  return true;
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
  expectedCount,
  until,
}: IPollForJobOptions & { findMultiple?: boolean }): Promise<JobEntity | JobEntity[] | null> {
  const startTime = Date.now();
  let lastMultipleJobs: JobEntity[] = [];

  while (true) {
    if (findMultiple) {
      const jobs = await jobRepository.find(query);
      lastMultipleJobs = jobs;

      if (areJobsReady(jobs, expectedCount, until)) {
        return jobs;
      }
    } else {
      const job = await jobRepository.findOne(query);

      if (job && job.status !== JobStatusEnum.PENDING) {
        return job;
      }
    }

    if (Date.now() - startTime > timeout) {
      return findMultiple ? lastMultipleJobs : null;
    }

    await sleep(pollInterval);
  }
}
