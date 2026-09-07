import { JobEntity, JobRepository, JobStatusEnum } from '@novu/dal';
import { sleep } from './sleep.util';

type EnforceEnvOrOrgIds = { _environmentId: string } | { _organizationId: string };

/*
 * Since the atomic child claim (claimNextChildAsQueued), deferred steps are flipped
 * PENDING -> QUEUED the moment the parent hands them to AddJob, before AddJob decides
 * their real outcome (DELAYED, FAILED, ...). Both are transient "not settled yet"
 * states, so polling must skip past them or it races AddJob and observes QUEUED.
 */
function isSettled(job: JobEntity): boolean {
  return job.status !== JobStatusEnum.PENDING && job.status !== JobStatusEnum.QUEUED;
}

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

  if (!jobs.every(isSettled)) {
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
  let lastJob: JobEntity | null = null;

  while (true) {
    if (findMultiple) {
      const jobs = await jobRepository.find(query);
      lastMultipleJobs = jobs;

      if (areJobsReady(jobs, expectedCount, until)) {
        return jobs;
      }
    } else {
      const job = await jobRepository.findOne(query);
      lastJob = job ?? lastJob;

      if (job && isSettled(job)) {
        return job;
      }
    }

    if (Date.now() - startTime > timeout) {
      // Last observed state (possibly unsettled) so assertions fail with the actual status
      return findMultiple ? lastMultipleJobs : lastJob;
    }

    await sleep(pollInterval);
  }
}
