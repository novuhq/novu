import { ExecutionDetailsStatusEnum } from '@novu/shared';
import { useEffect, useState } from 'react';
import { getJobStatus } from './useJobStatus';

export const useNotificationStatus = (notification: any) => {
  const [status, setStatus] = useState(ExecutionDetailsStatusEnum.PENDING);

  useEffect(() => {
    const result = notification.jobs
      .map((job) => {
        return getJobStatus(job);
      })
      .reduce((prev, item) => {
        if (prev === 'Success') {
          return prev;
        }
        if (prev === 'Failed') {
          return prev;
        }

        return item;
      }, ExecutionDetailsStatusEnum.PENDING);
    setStatus(result);
  }, [notification]);

  return status;
};
