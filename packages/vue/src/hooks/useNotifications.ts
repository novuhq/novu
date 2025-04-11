import { ref, computed, onMounted, watch, onUnmounted, MaybeRef, Ref } from 'vue';
import { ListNotificationsResponse, Notification, NovuError, isSameFilter, NotificationFilter } from '@novu/js';
import { useNovu } from '../context/NovuProviderContext';
import { toRefSafe } from './internal/useDataRef';

export type UseNotificationsProps = {
  tags?: MaybeRef<string[] | undefined>;
  read?: MaybeRef<boolean | undefined>;
  archived?: MaybeRef<boolean | undefined>;
  limit?: MaybeRef<number | undefined>;
  onSuccess?: (data: Notification[]) => void;
  onError?: (error: NovuError) => void;
};

export type UseNotificationsResult = {
  notifications: Ref<Notification[] | undefined>;
  error: Ref<NovuError | undefined>;
  isLoading: Ref<boolean>;
  isFetching: Ref<boolean>;
  hasMore: Ref<boolean>;
  readAll: () => Promise<{
    data?: void | undefined;
    error?: NovuError | undefined;
  }>;
  archiveAll: () => Promise<{
    data?: void | undefined;
    error?: NovuError | undefined;
  }>;
  archiveAllRead: () => Promise<{
    data?: void | undefined;
    error?: NovuError | undefined;
  }>;
  refetch: () => Promise<void>;
  fetchMore: () => Promise<void>;
};

export function useNotifications(props?: UseNotificationsProps): UseNotificationsResult {
  const {
    tags: tagsInput,
    read: readInput,
    archived: archivedInput,
    limit: limitInput,
    onSuccess,
    onError,
  } = props || {};
  const tags = toRefSafe(tagsInput);
  const read = toRefSafe(readInput);
  const archived = toRefSafe(archivedInput, false);
  const limit = toRefSafe(limitInput);

  const novu = useNovu();

  const data = ref<Notification[] | undefined>(undefined);
  const error = ref<NovuError | undefined>(undefined);
  const isLoading = ref(true);
  const isFetching = ref(false);
  const hasMore = ref(false);
  const filterRef = ref<NotificationFilter | undefined>(undefined);

  const length = computed(() => data.value?.length || 0);
  const after = computed(() => (length.value ? data.value![length.value - 1].id : undefined));

  const sync = (event: { data?: ListNotificationsResponse }) => {
    if (!event.data || (filterRef.value && !isSameFilter(filterRef.value, event.data.filter))) {
      return;
    }
    data.value = event.data.notifications;
    hasMore.value = event.data.hasMore;
  };

  const fetchNotifications = async (options?: { refetch: boolean }) => {
    if (options?.refetch) {
      error.value = undefined;
      isLoading.value = true;
      isFetching.value = false;
    }
    isFetching.value = true;

    const response = await novu.value.notifications.list({
      tags: tags.value,
      read: read.value,
      archived: archived.value,
      limit: limit.value,
      after: options?.refetch ? undefined : after.value,
    });

    if (response.error) {
      error.value = response.error;
      onError?.(response.error);
    } else {
      data.value = response.data!.notifications;
      hasMore.value = response.data!.hasMore;
      onSuccess?.(response.data!.notifications);
    }

    isLoading.value = false;
    isFetching.value = false;
  };

  const refetch = async () => {
    novu.value.notifications.clearCache({ filter: { tags: tags.value, read: read.value, archived: archived.value } });
    await fetchNotifications({ refetch: true });
  };

  const fetchMore = async () => {
    if (!hasMore.value || isFetching.value) return;
    await fetchNotifications();
  };

  const readAll = async () => await novu.value.notifications.readAll({ tags: tags.value });

  const archiveAll = async () => await novu.value.notifications.archiveAll({ tags: tags.value });

  const archiveAllRead = async () => await novu.value.notifications.archiveAllRead({ tags: tags.value });

  onMounted(() => {
    const cleanup = novu.value.on('notifications.list.updated', sync);
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    fetchNotifications();

    onUnmounted(() => cleanup());
  });

  watch([tags, read, archived], async () => {
    const newFilter = { tags: tags.value, read: read.value, archived: archived.value };
    if (filterRef.value && isSameFilter(filterRef.value, newFilter)) return;

    novu.value.notifications.clearCache({ filter: filterRef.value });
    filterRef.value = newFilter;

    await fetchNotifications({ refetch: true });
  });

  return {
    readAll,
    archiveAll,
    archiveAllRead,
    notifications: data as Ref<Notification[] | undefined>,
    error,
    isLoading,
    isFetching,
    refetch,
    fetchMore,
    hasMore,
  };
}
