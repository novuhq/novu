import { useEffect, useState } from 'react';
import { Notification, NotificationFilter, NovuError, areTagsEqual } from '@novu/js';
import { useNovu } from './NovuProvider';
import { useWebSocketEvent } from './internal/useWebsocketEvent';

type Count = {
  count: number;
  filter: NotificationFilter;
};

type UseCountsProps = {
  filters: NotificationFilter[];
  onSuccess?: (data: Count[]) => void;
  onError?: (error: NovuError) => void;
};

type UseCountsResult = {
  counts?: Count[];
  error?: NovuError;
  isLoading: boolean; // initial loading
  isFetching: boolean; // the request is in flight
  refetch: () => Promise<void>;
};

export const useCounts = (props: UseCountsProps): UseCountsResult => {
  const { filters, onSuccess, onError } = props;
  const { notifications } = useNovu();
  const [error, setError] = useState<NovuError>();
  const [counts, setCounts] = useState<Count[]>();
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);

  const sync = async (notification?: Notification) => {
    const existingCounts = counts ?? (new Array(filters.length).fill(undefined) as (Count | undefined)[]);
    let countFiltersToFetch: NotificationFilter[] = [];
    if (notification) {
      // eslint-disable-next-line no-plusplus
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
      onError?.(countsRes.error);

      return;
    }
    const data = countsRes.data!;
    onSuccess?.(data.counts);

    setCounts((oldCounts) => {
      const newCounts: Count[] = [];
      const countsReceived = data.counts;

      // eslint-disable-next-line no-plusplus
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

  useWebSocketEvent({
    event: 'notifications.unread_count_changed',
    eventHandler: () => {
      sync();
    },
  });

  useEffect(() => {
    setError(undefined);
    setIsLoading(true);
    setIsFetching(false);
    sync();
  }, [JSON.stringify(filters)]);

  const refetch = async () => {
    await sync();
  };

  return { counts, error, refetch, isLoading, isFetching };
};
