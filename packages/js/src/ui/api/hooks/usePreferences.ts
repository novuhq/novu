import { createResource } from 'solid-js';
import { FetchPreferencesArgs } from '../../../preferences/types';
import { useNovu } from '../../context';

export const usePreferences = (options?: FetchPreferencesArgs) => {
  const novu = useNovu();

  const [preferences, { mutate, refetch }] = createResource(options || {}, async () => {
    try {
      const response = await novu.preferences.fetch();

      return response;
    } catch (error) {
      console.error('Error fetching feeds:', error);
      throw error;
    }
  });

  return { preferences, mutate, refetch };
};
