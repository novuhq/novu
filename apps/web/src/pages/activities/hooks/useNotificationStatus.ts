import { useEffect, useState } from 'react';
import { getJobStatus } from './useJobStatus';

export const useNotificationStatus = (notification: any) => {
  const [status, setStatus] = useState('Pending');

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
      }, 'Pending');
    setStatus(result);
  }, [notification]);

  return status;
};
