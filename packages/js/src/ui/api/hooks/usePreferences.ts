import { createEffect, createResource, createSignal, onCleanup } from 'solid-js';
import { Preference } from '../../../preferences/preference';
import { FetchPreferencesArgs } from '../../../preferences/types';
import { useNovu } from '../../context';

export const usePreferences = (options?: FetchPreferencesArgs) => {
  const novuAccessor = useNovu();

  const [loading, setLoading] = createSignal(true);
  const [preferences, { mutate, refetch }] = createResource(
    () => ({ ...options, dependency: novuAccessor() }),
    async ({ tags, severity, criticality }) => {
      try {
        const response = await novuAccessor().preferences.list({ tags, severity, criticality });

        return response.data;
      } catch (error) {
        console.error('Error fetching preferences:', error);
        throw error;
      }
    }
  );

  createEffect(() => {
    const listener = ({ data }: { data: Preference[] }) => {
      if (!data) {
        return;
      }

      mutate(data);
    };

    const cleanup = novuAccessor().on('preferences.list.updated', listener);

    onCleanup(() => cleanup());
  });

  createEffect(() => {
    setLoading(preferences.loading);
  });

  return { preferences, loading, mutate, refetch };
};
