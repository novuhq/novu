import { ExecutionDetailsStatusEnum } from '@novu/shared';
import { useEffect, useState } from 'react';
import { getJobStatus } from './useJobStatus';

export const useNotificationStatus = (notification: any): ExecutionDetailsStatusEnum => {
  const [status, setStatus] = useState(ExecutionDetailsStatusEnum.PENDING);

  useEffect(() => {
    const result = notification.jobs
      .map((job) => {
        return getJobStatus(job);
      })
      .reduce((prev: ExecutionDetailsStatusEnum, item: ExecutionDetailsStatusEnum) => {
        if (prev === ExecutionDetailsStatusEnum.SUCCESS) {
          return prev;
        }
        if (prev === ExecutionDetailsStatusEnum.FAILED) {
          return prev;
        }

        return item;
      }, ExecutionDetailsStatusEnum.PENDING);
    setStatus(result);
  }, [notification]);

  return status;
};
