import { ref, onMounted, onUnmounted, MaybeRef, Ref, watch } from 'vue';
import type { NovuError, Preference } from '@novu/js';
import { useNovu } from '../context/NovuProviderContext';
import { toRefSafe } from './internal/useDataRef';

export type UsePreferencesProps = {
  filter?: MaybeRef<{ tags?: string[] }>;
  onSuccess?: (data: Preference[]) => void;
  onError?: (error: NovuError) => void;
};

export type UsePreferencesResult = {
  preferences: Ref<Preference[] | undefined>;
  error: Ref<NovuError | undefined>;
  isLoading: Ref<boolean>; // initial loading
  isFetching: Ref<boolean>; // the request is in flight
  refetch: () => Promise<void>;
};

export function usePreferences(props?: UsePreferencesProps): UsePreferencesResult {
  const { filter: filterInput, onSuccess, onError } = props || {};
  const filter = toRefSafe(filterInput);
  const novu = useNovu();

  const data = ref<Preference[] | undefined>(undefined);
  const error = ref<NovuError | undefined>(undefined);
  const isLoading = ref(true);
  const isFetching = ref(false);

  const sync = (event: { data?: Preference[] }) => {
    if (event.data) {
      data.value = event.data;
    }
  };

  const fetchPreferences = async () => {
    isFetching.value = true;
    const response = await novu.value.preferences.list(filter.value);

    if (response.error) {
      error.value = response.error;
      onError?.(response.error);
    } else {
      data.value = response.data!;
      onSuccess?.(response.data!);
    }

    isLoading.value = false;
    isFetching.value = false;
  };

  const refetch = async () => {
    novu.value.preferences.cache.clearAll();
    await fetchPreferences();
  };

  onMounted(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    fetchPreferences();

    const listUpdatedCleanup = novu.value.on('preferences.list.updated', sync);
    const listPendingCleanup = novu.value.on('preferences.list.pending', sync);
    const listResolvedCleanup = novu.value.on('preferences.list.resolved', sync);

    onUnmounted(() => {
      listUpdatedCleanup();
      listPendingCleanup();
      listResolvedCleanup();
    });
  });

  watch(filter, refetch);

  return {
    preferences: data as Ref<Preference[] | undefined>,
    error,
    isLoading,
    isFetching,
    refetch,
  };
}
