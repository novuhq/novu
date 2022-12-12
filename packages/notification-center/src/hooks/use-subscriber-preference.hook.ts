import { useApi } from './use-api.hook';
import { useEffect, useState } from 'react';
import type { IUserPreferenceSettings } from '@novu/client';
import { useAuth } from './use-auth.hook';

export function useSubscriberPreference() {
  const [preferences, setPreferences] = useState<IUserPreferenceSettings[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const { api } = useApi();
  const { token } = useAuth();

  useEffect(() => {
    if (!api?.isAuthenticated || !token) return;

    getUserPreference();
  }, [api?.isAuthenticated, token]);

  async function getUserPreference() {
    setLoading(true);
    const result = await api.getUserPreference();
    setPreferences(result);
    setLoading(false);
  }

  async function updatePreference(
    preferenceItem: IUserPreferenceSettings,
    channelType: string,
    checked: boolean,
    preferenceIndex: number
  ) {
    const result = await api.updateSubscriberPreference(preferenceItem.template._id, channelType, checked);

    setPreferences((prev) => {
      return prev.map((workflow, i) => {
        if (i === preferenceIndex) {
          return result;
        }

        return workflow;
      });
    });
  }

  return {
    preferences,
    updatePreference,
    loading,
  };
}
