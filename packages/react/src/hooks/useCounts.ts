import { areTagsEqual, isSameFilter } from '@novu/js';
import { NotificationFilter, NovuError } from '@novu/js';
import { useEffect, useState } from 'react';
import { useNovu } from '../components/NovuProvider';
import { useWebSocketEvent } from './useWebsocketEvent';
import { Notification } from '@novu/js';

type UseCountsProps = {
  filters: NotificationFilter[];
  onSuccess?: (data: Notification[]) => void;
  onError?: (error: NovuError) => void;
};

type CountsData = {
  count: number;
  filter: NotificationFilter;
};

type Count = {
  count: number;
  filter: NotificationFilter;
};

type UseCountsResult = {
  counts?: Count[];
  error?: NovuError;
  isLoading: boolean; // initial loading
  isFetching: boolean; // the request is in flight
  refetch: () => Promise<void>;
};

export const useCounts = (props: UseCountsProps): UseCountsResult => {
  const { filters } = props;
  const { notifications } = useNovu();
  const [error, setError] = useState<NovuError>();
  const [counts, setCounts] = useState<Count[]>();
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);

  const sync = async (notification?: Notification) => {
    const existingCounts = counts ?? (new Array(filters.length).fill(undefined) as (Count | undefined)[]);
    let countFiltersToFetch: NotificationFilter[] = [];
    if (notification) {
      for (let i = 0; i < existingCounts.length; i++) {
        const filter = filters[i];
        if (areTagsEqual(filter.tags, notification.tags)) {
          countFiltersToFetch.push(filter);
        }
      }
    } else {
      countFiltersToFetch = filters;
    }

    if (countFiltersToFetch.length === 0) {
      return;
    }

    setIsFetching(true);
    const countsRes = await notifications.count({ filters: countFiltersToFetch });
    setIsFetching(false);
    setIsLoading(false);
    if (countsRes.error) {
      setError(countsRes.error);
      return;
    }

    setCounts((oldCounts) => {
      const newCounts: Count[] = [];
      const countsReceived = countsRes.data!.counts;

      for (let i = 0; i < existingCounts.length; i++) {
        const countReceived = countsReceived.find((c) => areTagsEqual(c.filter.tags, existingCounts[i]?.filter.tags));

        newCounts.push(countReceived || oldCounts![i]);
      }
      return newCounts;
    });
  };

  useWebSocketEvent({
    event: 'notifications.notification_received',
    eventHandler: (data) => {
      sync(data.result);
    },
  });

  useEffect(() => {
    sync();
  }, []);

  const refetch = async () => {
    await sync();
    return;
  };

  return { counts, error, refetch, isLoading, isFetching };
};
