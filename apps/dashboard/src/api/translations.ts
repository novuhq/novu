import { getV2 } from './api.client';
import { IEnvironment } from '@novu/shared';

export type TranslationsFilter = {
  query?: string;
  limit?: number;
  offset?: number;
};

export type TranslationGroup = {
  _id: string;
  resourceId: string;
  resourceName: string;
  resourceType: string;
  locales: string[];
  createdAt: string;
  updatedAt: string;
};

export type GetTranslationsListResponse = {
  data: TranslationGroup[];
  total: number;
  limit: number;
  offset: number;
};

export const getTranslationsList = async ({
  environment,
  query,
  limit = 50,
  offset = 0,
}: TranslationsFilter & { environment: IEnvironment }): Promise<GetTranslationsListResponse> => {
  const searchParams = new URLSearchParams();

  if (query) {
    searchParams.append('query', query);
  }

  searchParams.append('limit', limit.toString());
  searchParams.append('offset', offset.toString());

  const queryString = searchParams.toString();
  const endpoint = `/translations/list${queryString ? `?${queryString}` : ''}`;

  return getV2<GetTranslationsListResponse>(endpoint, { environment });
};
