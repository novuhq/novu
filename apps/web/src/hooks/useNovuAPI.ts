import { useCallback, useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { buildApiHttpClient } from '../api/api.client';
// eslint-disable-next-line import/no-namespace
import * as mixpanel from 'mixpanel-browser';
import { useStudioState } from '../studio/StudioStateProvider';
import { getToken } from '../components/providers/AuthProvider';

function useNovuAPI() {
  const { devSecretKey } = useStudioState();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => buildApiHttpClient({ secretKey: devSecretKey, jwt: getToken() }), []);
}

// WIP: This method should accept more parameters, not just transactionId
export const useNotifications = (transactionId: string, options?: any) => {
  const api = useNovuAPI();

  return useQuery<{ data: any[] }>(
    ['notifications', `transaction-${transactionId}`],
    () => api.getNotifications({ page: 0, transactionId }),
    options
  );
};

export const useNotification = (notificationId: string, options?: any) => {
  const api = useNovuAPI();

  return useQuery(['notifications', notificationId], () => api.getNotification(notificationId), options);
};

export const useApiKeys = (options?: any) => {
  const api = useNovuAPI();

  return useQuery<{ key: string }[]>(['getApiKeys'], () => api.getApiKeys(), options);
};

export const useTelemetry = () => {
  const api = useNovuAPI();

  const { mutate } = useMutation(({ event, data }: { event: string; data?: Record<string, unknown> }) =>
    api.postTelemetry(event, data)
  );

  return useCallback(
    (event: string, data?: Record<string, unknown>) => {
      const mixpanelEnabled = !!process.env.REACT_APP_MIXPANEL_KEY;

      if (mixpanelEnabled) {
        const sessionReplayProperties = mixpanel.get_session_recording_properties();

        data = {
          ...(data || {}),
          ...sessionReplayProperties,
        };
      }

      return mutate({ event: event + ' - [WEB]', data });
    },
    [mutate]
  );
};
