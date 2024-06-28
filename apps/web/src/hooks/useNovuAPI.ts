import { useMemo } from 'react';
import { getToken } from './useAuth';
import { useQuery } from '@tanstack/react-query';
import { buildAPIHTTPClient } from '../api/api.client';
import { useStudioState } from '../studio/StudioStateProvider';

function useNovuAPI() {
  const { devSecretKey } = useStudioState();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => buildAPIHTTPClient({ secretKey: devSecretKey, jwt: getToken() }), []);
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
