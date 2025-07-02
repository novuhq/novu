import { delV2, getV2, postV2 } from './api.client';
import { IEnvironment } from '@novu/shared';
import { LocalizationResourceEnum } from '@/types/translations';

export type TranslationsFilter = {
  query?: string;
  limit?: number;
  offset?: number;
};

export type TranslationGroup = {
  resourceId: string;
  resourceName: string;
  resourceType: LocalizationResourceEnum;
  locales: string[];
  createdAt: string;
  updatedAt: string;
};

export type Translation = {
  resourceId: string;
  resourceType: LocalizationResourceEnum;
  locale: string;
  content: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type GetTranslationsListResponse = {
  data: TranslationGroup[];
  total: number;
  limit: number;
  offset: number;
};

export type GetTranslationsResponse = {
  data: Translation[];
  total: number;
};

export type UploadTranslationsRequest = {
  resourceId: string;
  resourceType: LocalizationResourceEnum;
  files: File[];
};

export type UploadTranslationsResponse = {
  data: {
    totalFiles: number;
    successfulUploads: number;
    failedUploads: number;
    errors: string[];
  };
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

export const getTranslations = async ({
  environment,
  resourceId,
  resourceType,
  locale,
}: {
  environment: IEnvironment;
  resourceId: string;
  resourceType: LocalizationResourceEnum;
  locale?: string;
}): Promise<GetTranslationsResponse> => {
  const searchParams = new URLSearchParams();

  searchParams.append('resourceId', resourceId);
  searchParams.append('resourceType', resourceType);

  if (locale) {
    searchParams.append('locale', locale);
  }

  const queryString = searchParams.toString();
  const endpoint = `/translations?${queryString}`;

  return getV2<GetTranslationsResponse>(endpoint, { environment });
};

export type GetTranslationResponse = {
  data: Translation;
};

export const getTranslation = async ({
  environment,
  resourceId,
  resourceType,
  locale,
}: {
  environment: IEnvironment;
  resourceId: string;
  resourceType: LocalizationResourceEnum;
  locale: string;
}): Promise<Translation> => {
  const endpoint = `/translations/${resourceType}/${resourceId}/${locale}`;
  const response = await getV2<GetTranslationResponse>(endpoint, { environment });
  return response.data;
};

export type SaveTranslationRequest = {
  resourceId: string;
  resourceType: LocalizationResourceEnum;
  locale: string;
  content: Record<string, unknown>;
};

export type SaveTranslationResponse = {
  data: Translation;
};

export const saveTranslation = async ({
  environment,
  resourceId,
  resourceType,
  locale,
  content,
}: SaveTranslationRequest & { environment: IEnvironment }): Promise<Translation> => {
  const endpoint = '/translations';
  const response = await postV2<SaveTranslationResponse>(endpoint, {
    body: {
      resourceId,
      resourceType,
      locale,
      content,
    },
    environment,
  });
  return response.data;
};

export type DeleteTranslationRequest = {
  resourceId: string;
  resourceType: LocalizationResourceEnum;
  locale: string;
};

export const deleteTranslation = async ({
  environment,
  resourceId,
  resourceType,
  locale,
}: DeleteTranslationRequest & { environment: IEnvironment }): Promise<void> => {
  const endpoint = `/translations/${resourceType}/${resourceId}/${locale}`;

  await delV2(endpoint, { environment });
};

export const uploadTranslations = async ({
  environment,
  resourceId,
  resourceType,
  files,
}: UploadTranslationsRequest & { environment: IEnvironment }): Promise<UploadTranslationsResponse['data']> => {
  const formData = new FormData();

  formData.append('resourceId', resourceId);
  formData.append('resourceType', resourceType);

  files.forEach((file) => {
    formData.append('files', file);
  });

  const endpoint = '/translations/upload';
  const response = await postV2<UploadTranslationsResponse>(endpoint, {
    body: formData,
    environment,
  });

  return response.data;
};
