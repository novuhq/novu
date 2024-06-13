import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { api } from '../../../api';
import { ITranslation } from './useFetchTranslationGroup';

export const useFetchTranslation = (identifier?: string, locale?: string) => {
  const { data, ...rest } = useQuery<ITranslation>(
    [`group/${identifier}/${locale}`],
    () => api.get(`/v1/translations/groups/${identifier}/locales/${locale}`),
    {
      enabled: !!identifier && !!locale,
    }
  );

  return {
    translations: data?.translations,
    fileName: data?.fileName,
    isoLanguage: data?.isoLanguage,
    createdAt: data?.createdAt,
    updatedAt: data?.updatedAt,
    ...rest,
  };
};
