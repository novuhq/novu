import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { ILocale } from '../components/shared';
import { api } from '../../../api';

export const useFetchLocales = (options: UseQueryOptions<ILocale[], any, ILocale[]> = {}) => {
  const { data: locales, ...rest } = useQuery<ILocale[], any, ILocale[]>(
    ['locales'],
    () => api.get('/v1/translations/locales'),
    {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      ...options,
    }
  );

  const getLocale = (isoLanguage: string) => {
    return locales?.find((locale) => locale.langIso === isoLanguage);
  };

  return {
    locales,
    getLocale,
    ...rest,
  };
};
