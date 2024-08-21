import { useQuery } from '@tanstack/react-query';
import { api } from '../../../api';

export const useGetDefaultLocale = () => {
  const { data } = useQuery<{ defaultLocale: string }>([`translations/defaultLocale`], () =>
    api.get(`/v1/translations/defaultLocale`)
  );

  return {
    defaultLocale: data?.defaultLocale,
  };
};
