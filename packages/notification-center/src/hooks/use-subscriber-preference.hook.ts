import { useApi } from './use-api.hook';
import { useContext, useEffect, useState } from 'react';
import { IAuthContext, IUserPreferenceSettings } from '../index';
import { AuthContext } from '../store/auth.context';

export function useSubscriberPreference() {
  const [preferences, setPreferences] = useState<IUserPreferenceSettings[]>([]);
  const { api } = useApi();
  const { token } = useContext<IAuthContext>(AuthContext);

  useEffect(() => {
    if (!api?.isAuthenticated || !token) return;

    getUserPreference();
  }, [api?.isAuthenticated, token]);

  async function getUserPreference() {
    const result = await api.getUserPreference();
    setPreferences(result);
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
  };
}
