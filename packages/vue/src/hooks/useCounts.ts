import { ref, watch, onMounted, Ref, MaybeRef } from 'vue';
import { Notification, NotificationFilter, NovuError, areTagsEqual } from '@novu/js';
import { useWebSocketEvent } from './internal/useWebsocketEvent';
import { useNovu } from '../context/NovuProviderContext';
import { toRefSafe } from './internal/useDataRef';

type Count = {
  count: number;
  filter: NotificationFilter;
};

export type UseCountsProps = {
  filters: MaybeRef<NotificationFilter[]>;
  onSuccess?: (data: Count[]) => void;
  onError?: (error: NovuError) => void;
};

export type UseCountsResult = {
  counts: Ref<Count[] | undefined>;
  error: Ref<NovuError | undefined>;
  isLoading: Ref<boolean>; // initial loading
  isFetching: Ref<boolean>; // the request is in flight
  refetch: () => Promise<void>;
};

export function useCounts(props: UseCountsProps): UseCountsResult {
  const { filters: filtersInput, onSuccess, onError } = props || {};
  const filters = toRefSafe(filtersInput);
  const novu = useNovu();

  const counts = ref<Count[] | undefined>(undefined);
  const error = ref<NovuError | undefined>(undefined);
  const isLoading = ref(true);
  const isFetching = ref(false);

  const sync = async (notification?: Notification) => {
    const existingCounts = counts.value ?? (new Array(filters.value.length).fill(undefined) as (Count | undefined)[]);
    let countFiltersToFetch: NotificationFilter[] = [];

    if (notification) {
      countFiltersToFetch = filters.value.filter((filter) => areTagsEqual(filter.tags, notification.tags));
    } else {
      countFiltersToFetch = filters.value;
    }

    if (countFiltersToFetch.length === 0) return;

    isFetching.value = true;
    const countsRes = await novu.notifications.count({ filters: countFiltersToFetch });
    isFetching.value = false;
    isLoading.value = false;

    if (countsRes.error) {
      error.value = countsRes.error;
      onError?.(countsRes.error);

      return;
    }

    const data = countsRes.data!;
    onSuccess?.(data.counts);

    counts.value = existingCounts.map((oldCount, i) => {
      const countReceived = data.counts.find((count) => areTagsEqual(count.filter.tags, filters.value[i].tags))!;

      return countReceived || oldCount;
    });
  };

  useWebSocketEvent('notifications.notification_received', (data) => sync(data.result));

  useWebSocketEvent('notifications.unread_count_changed', () => sync());

  watch(filters, async () => {
    error.value = undefined;
    isLoading.value = true;
    isFetching.value = false;
    await sync();
  });

  onMounted(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    sync();
  });

  const refetch = async () => {
    await sync();
  };

  return { counts, error, refetch, isLoading, isFetching };
}
