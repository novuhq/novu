import { useEffect, useState } from 'react';

export const getJobStatus = (job) => {
  return job.executionDetails
    ?.map((detail) => detail.status)
    .reduce((prev, item) => {
      if (prev === 'Success') {
        return prev;
      }
      if (prev === 'Failed') {
        return prev;
      }

      return item;
    }, 'Pending');
};

export const useJobStatus = (job: any) => {
  const [status, setStatus] = useState('Pending');

  useEffect(() => {
    setStatus(getJobStatus(job));
  }, [job]);

  return status;
};
