import { createEffect, createResource } from 'solid-js';
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

  createEffect(() => {
    setLoading(preferences.loading);
  });

  return { preferences: preferences, loading, mutate, refetch };
};
