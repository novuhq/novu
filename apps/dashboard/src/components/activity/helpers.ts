import { IActivityJob, JobStatusEnum } from '@novu/shared';

export const getActivityStatus = (jobs: IActivityJob[]) => {
  if (!jobs.length) return JobStatusEnum.PENDING;

  const hasFailedJob = jobs.some((job) => job.status === JobStatusEnum.FAILED);

  if (hasFailedJob) {
    return JobStatusEnum.FAILED;
  }

  const lastJob = jobs[jobs.length - 1];

  if (lastJob.status === JobStatusEnum.SKIPPED || lastJob.status === JobStatusEnum.CANCELED) {
    const previousJobs = jobs.slice(0, -1);
    const hasPreviousCompletedJobs = previousJobs.some((job) => job.status === JobStatusEnum.COMPLETED);

    if (hasPreviousCompletedJobs || !previousJobs.length) {
      return JobStatusEnum.COMPLETED;
    }
  }

  return lastJob.status;
};
