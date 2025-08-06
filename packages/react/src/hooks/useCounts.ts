import { areTagsEqual, isSameFilter, Notification, NotificationFilter, NovuError } from '@novu/js';
import { useEffect, useState } from 'react';
import { useWebSocketEvent } from './internal/useWebsocketEvent';
import { useNovu } from './NovuProvider';

type Count = {
  count: number;
  filter: NotificationFilter;
};

/**
 * Props for the useCounts hook.
 *
 * @example
 * ```tsx
 * // Count unread notifications
 * const { counts } = useCounts({
 *   filters: [{ read: false }]
 * });
 *
 * // Count unseen notifications with specific tags
 * const { counts } = useCounts({
 *   filters: [{ seen: false, tags: ['important'] }]
 * });
 *
 * // Count seen but unread notifications
 * const { counts } = useCounts({
 *   filters: [{ seen: true, read: false }]
 * });
 * ```
 */
export type UseCountsProps = {
  filters: NotificationFilter[];
  onSuccess?: (data: Count[]) => void;
  onError?: (error: NovuError) => void;
};

export type UseCountsResult = {
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
    const existingCounts = counts ?? filters.map((filter) => ({ count: 0, filter }));
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
      onError?.(countsRes.error);

      return;
    }
    const data = countsRes.data!;
    onSuccess?.(data.counts);

    setCounts((oldCounts) => {
      const newCounts: Count[] = [];
      const countsReceived = data.counts;

      for (let i = 0; i < existingCounts.length; i++) {
        const countReceived = countsReceived.find((c) => isSameFilter(c.filter, existingCounts[i].filter));
        const count = countReceived || (oldCounts && oldCounts[i]);
        if (count) {
          newCounts.push(count);
        }
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
