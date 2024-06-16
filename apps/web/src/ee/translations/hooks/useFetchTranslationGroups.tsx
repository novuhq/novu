import { UseQueryOptions, useQuery } from '@tanstack/react-query';
import React from 'react';
import { api } from '../../../api';

export interface ITranslationGroup {
  _id: string;
  name: string;
  identifier: string;
  _environmentId: string;
  _organizationId: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
  id: string;
  uiConfig: {
    locales: string[];
    localesMissingTranslations: string[];
  };
}

export const useFetchTranslationGroups = (page = 0, limit = 10) => {
  const { data, ...rest } = useQuery<{
    data: ITranslationGroup[];
    totalCount: number;
    pageSize: number;
    page: number;
  }>(['translationGroups', page, limit], () => api.getFullResponse('/v1/translations/groups', { page, limit }), {
    keepPreviousData: true,
  });

  return {
    translationGroups: data?.data,
    page: data?.page,
    pageSize: data?.pageSize,
    totalCount: data?.totalCount,
    ...rest,
  };
};
