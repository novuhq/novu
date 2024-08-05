import { createResource } from 'solid-js';
import { FetchPreferencesArgs } from '../../../preferences/types';
import { useNovu } from '../../context';

export const usePreferences = (options?: FetchPreferencesArgs) => {
  const novu = useNovu();

  const [preferences, { mutate, refetch }] = createResource(options || {}, async () => {
    try {
      const response = await novu.preferences.list();

      return response.data;
    } catch (error) {
      console.error('Error fetching preferences:', error);
      throw error;
    }
  });

  return { preferences, mutate, refetch };
};
