import { JobStatusEnum } from '@novu/shared';
import { useEffect, useState } from 'react';

export const useNotificationStatus = (notification: any): JobStatusEnum => {
  const [status, setStatus] = useState(JobStatusEnum.PENDING);

  useEffect(() => {
    const jobs = notification?.jobs || [];
    const result = jobs
      ?.map((job) => {
        return job.status;
      })
      .reduce((prev: JobStatusEnum, item: JobStatusEnum) => {
        if (prev === JobStatusEnum.FAILED) {
          return prev;
        }
        if ([JobStatusEnum.PENDING, JobStatusEnum.DELAYED].includes(prev)) {
          return prev;
        }

        return item;
      }, undefined);
    setStatus(result);
  }, [notification]);

  return status;
};
