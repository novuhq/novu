import { areTagsEqual, isSameFilter, Notification, NotificationFilter, NovuError } from '@novu/js';
import { useEffect, useState } from 'react';
import { useDataRef } from './internal/useDataRef';
import { useWebSocketEvent } from './internal/useWebsocketEvent';
import { useNovu, useRealtime } from './NovuProvider';

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
 *
 * // Opt out of the built-in realtime count updates and drive them yourself
 * const { counts, refetch } = useCounts({
 *   filters: [{ read: false }],
 *   realtime: false,
 * });
 * ```
 */
export type UseCountsProps = {
  filters: NotificationFilter[];
  /**
   * When `false`, disables the WebSocket subscriptions that auto-resync
   * counts on `notifications.notification_received` and
   * `notifications.unread_count_changed`. The filter-driven fetch and
   * `refetch()` keep working. Use alongside
   * `useNotifications({ realtime: false })` when you drive live updates
   * yourself.
   *
   * When set, this prop takes precedence over the `realtime` config on
   * `<NovuProvider />`. When omitted, the provider value (default `true`) is used.
   */
  realtime?: boolean;
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
  const { filters, realtime: propsRealtime, onSuccess, onError } = props;
  const { notifications } = useNovu();
  const providerRealtime = useRealtime();
  const realtime = propsRealtime ?? providerRealtime;
  const filtersRef = useDataRef<NotificationFilter[]>(filters);
  const [error, setError] = useState<NovuError>();
  const [counts, setCounts] = useState<Count[]>();
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);

  const sync = async (notification?: Notification, overrideFilters?: NotificationFilter[]) => {
    const currentFilters = overrideFilters || filtersRef.current;
    const existingCounts = currentFilters.map((filter) => ({ count: 0, filter }));
    let countFiltersToFetch: NotificationFilter[] = [];
    if (notification) {
      for (let i = 0; i < existingCounts.length; i++) {
        const filter = currentFilters[i];
        const isSeverityMatches =
          !filter.severity ||
          (Array.isArray(filter.severity) && filter.severity.length === 0) ||
          (Array.isArray(filter.severity) && filter.severity.includes(notification.severity)) ||
          (!Array.isArray(filter.severity) && filter.severity === notification.severity);

        if (areTagsEqual(filter.tags, notification.tags) && isSeverityMatches) {
          countFiltersToFetch.push(filter);
        }
      }
    } else {
      countFiltersToFetch = currentFilters;
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
        const existingFilter = existingCounts[i].filter;
        const countReceived = countsReceived.find((c) => isSameFilter(c.filter, existingFilter));
        const count = countReceived || oldCounts?.[i];
        if (count) {
          newCounts.push(count);
        }
      }

      return newCounts;
    });
  };

  useWebSocketEvent({
    event: 'notifications.notification_received',
    enabled: realtime,
    eventHandler: (data) => {
      sync(data.result);
    },
  });

  useWebSocketEvent({
    event: 'notifications.unread_count_changed',
    enabled: realtime,
    eventHandler: () => {
      sync();
    },
  });

  useEffect(() => {
    setError(undefined);
    setIsLoading(true);
    setIsFetching(false);
    sync(undefined, filters);
  }, [JSON.stringify(filters)]);

  const refetch = async () => {
    await sync();
  };

  return { counts, error, refetch, isLoading, isFetching };
};
