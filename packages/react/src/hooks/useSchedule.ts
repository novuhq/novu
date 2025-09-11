import { NovuError, Schedule } from '@novu/js';
import { useEffect, useState } from 'react';
import { useNovu } from './NovuProvider';

export type UseScheduleProps = {
  onSuccess?: (data: Schedule) => void;
  onError?: (error: NovuError) => void;
};

export type UseScheduleResult = {
  schedule?: Schedule;
  error?: NovuError;
  isLoading: boolean; // initial loading
  isFetching: boolean; // the request is in flight
  refetch: () => Promise<void>;
};

export const useSchedule = (props?: UseScheduleProps): UseScheduleResult => {
  const { onSuccess, onError } = props || {};
  const [data, setData] = useState<Schedule>();
  const { preferences, on } = useNovu();
  const [error, setError] = useState<NovuError>();
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);

  const sync = (event: { data?: Schedule }) => {
    if (!event.data) {
      return;
    }
    setData(event.data);
  };

  useEffect(() => {
    fetchSchedule();

    const listUpdatedCleanup = on('preference.schedule.get.updated', sync);
    const listPendingCleanup = on('preference.schedule.get.pending', sync);
    const listResolvedCleanup = on('preference.schedule.get.resolved', sync);

    return () => {
      listUpdatedCleanup();
      listPendingCleanup();
      listResolvedCleanup();
    };
  }, []);

  const fetchSchedule = async () => {
    setIsFetching(true);
    const response = await preferences.schedule.get();
    if (response.error) {
      setError(response.error);
      onError?.(response.error);
    } else {
      onSuccess?.(response.data!);
    }
    setIsLoading(false);
    setIsFetching(false);
  };

  const refetch = () => {
    preferences.schedule.cache.clearAll();

    return fetchSchedule();
  };

  return {
    schedule: data,
    error,
    isLoading,
    isFetching,
    refetch,
  };
};
