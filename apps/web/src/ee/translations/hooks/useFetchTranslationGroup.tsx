import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { api } from '../../../api';

export interface ITranslationGroupWithTranslations {
  _id: string;
  name: string;
  identifier: string;
  _environmentId: string;
  _organizationId: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
  id: string;
  translations: ITranslation[];
}
export interface ITranslation {
  _id: string;
  createdAt: string;
  updatedAt: string;
  _environmentId: string;
  _organizationId: string;
  _groupId: string;
  isoLanguage: string;
  translations: any;
  fileName: string;
}
export const useFetchTranslationGroup = (identifier?: string) => {
  const { data: group, ...rest } = useQuery<ITranslationGroupWithTranslations>(
    [`group/${identifier}`],
    () => api.get(`/v1/translations/groups/${identifier}`),
    {
      enabled: !!identifier,
    }
  );

  return {
    group,
    translations: group?.translations,
    ...rest,
  };
};
