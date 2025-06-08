import { JobStatusEnum, IActivityJob } from '@novu/shared';

export const getActivityStatus = (jobs: IActivityJob[]) => {
  if (!jobs.length) return JobStatusEnum.PENDING;

  const lastJob = jobs[jobs.length - 1];

  return lastJob.status;
};
