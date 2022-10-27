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
        if (prev === ExecutionDetailsStatusEnum.FAILED) {
          return prev;
        }
        if (prev === ExecutionDetailsStatusEnum.PENDING) {
          return prev;
        }

        return item;
      }, undefined);
    setStatus(result);
  }, [notification]);

  return status;
};
