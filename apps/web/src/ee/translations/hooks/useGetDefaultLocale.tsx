import { useQuery } from '@tanstack/react-query';
import { api } from '../../../api';
import { useAuth } from '../../../hooks';

export const useGetDefaultLocale = () => {
  const { currentOrganization } = useAuth();
  const { data } = useQuery<{ defaultLocale: string }>(
    [`translations/defaultLocale, ${currentOrganization?._id}`],
    () => api.get(`/v1/translations/defaultLocale`),
    {
      enabled: !!currentOrganization,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      retry: false,
      staleTime: 3600000, // 1 hour
    }
  );

  return {
    defaultLocale: data?.defaultLocale,
  };
};
