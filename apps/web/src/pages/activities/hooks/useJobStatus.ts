import { ExecutionDetailsStatusEnum } from '@novu/shared';
import { useEffect, useState } from 'react';

export const getJobStatus = (job): ExecutionDetailsStatusEnum => {
  return job.executionDetails
    ?.map((detail) => detail.status)
    .reduce((prev, item) => {
      if (prev === ExecutionDetailsStatusEnum.SUCCESS) {
        return prev;
      }
      if (prev === ExecutionDetailsStatusEnum.FAILED) {
        return prev;
      }

      return item;
    }, ExecutionDetailsStatusEnum.PENDING);
};

export const useJobStatus = (job: any): ExecutionDetailsStatusEnum => {
  const [status, setStatus] = useState(ExecutionDetailsStatusEnum.PENDING);

  useEffect(() => {
    setStatus(getJobStatus(job));
  }, [job]);

  return status;
};
