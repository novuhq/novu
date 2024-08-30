import { createEffect, createResource, onCleanup, onMount } from 'solid-js';
import { reconcile } from 'solid-js/store';
import { Preference } from '../../../preferences/preference';
import { FetchPreferencesArgs } from '../../../preferences/types';
import { useNovu } from '../../context';
import { createDelayedLoading } from '../../helpers/createDelayedLoading';

export const usePreferences = (options?: FetchPreferencesArgs) => {
  const novu = useNovu();

  const [loading, setLoading] = createDelayedLoading(true, 300);
  const [preferences, { mutate, refetch }] = createResource(options || {}, async () => {
    try {
      const response = await novu.preferences.list();

      return response.data;
    } catch (error) {
      console.error('Error fetching preferences:', error);
      throw error;
    }
  });

  onMount(() => {
    const listener = ({ data }: { data: Preference[] }) => {
      if (!data) {
        return;
      }

      mutate(reconcile(data));
    };

    novu.on('preferences.list.updated', listener);

    onCleanup(() => novu.off('preferences.list.updated', listener));
  });

  createEffect(() => {
    setLoading(preferences.loading);
  });

  return { preferences: preferences, loading, mutate, refetch };
};
