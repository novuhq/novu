import {
  CreateTranslationRequestDto,
  GetMasterJsonResponseDto,
  ImportMasterJsonResponseDto,
  TranslationGroupDto,
  TranslationResponseDto,
  UploadTranslationsResponseDto,
} from '@novu/api/models/components';
import { IEnvironment } from '@novu/shared';
import { delV2, getV2, postV2 } from './api.client';

// Shared resource type from SDK
type ResourceType = TranslationGroupDto['resourceType'];

// Request types
export type TranslationsFilter = {
  query?: string;
  limit?: number;
  offset?: number;
};

export type SaveTranslationRequest = CreateTranslationRequestDto;

export type DeleteTranslationRequest = {
  resourceId: string;
  resourceType: ResourceType;
  locale: string;
};

export type DeleteTranslationGroupRequest = {
  resourceId: string;
  resourceType: ResourceType;
};

export type UploadTranslationsRequest = {
  resourceId: string;
  resourceType: ResourceType;
  files: File[];
};

export type UploadMasterJsonRequest = {
  file: File;
};

// Response types
export type GetTranslationsListResponse = {
  data: TranslationGroupDto[];
  total: number;
  limit: number;
  offset: number;
};

// API functions
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

export const getTranslationGroup = async ({
  environment,
  resourceId,
  resourceType,
}: {
  environment: IEnvironment;
  resourceId: string;
  resourceType: ResourceType;
}): Promise<TranslationGroupDto> => {
  const endpoint = `/translations/group/${resourceType}/${resourceId}`;
  const response = await getV2<{ data: TranslationGroupDto }>(endpoint, { environment });

  return response.data;
};

export const getTranslation = async ({
  environment,
  resourceId,
  resourceType,
  locale,
}: {
  environment: IEnvironment;
  resourceId: string;
  resourceType: ResourceType;
  locale: string;
}): Promise<TranslationResponseDto> => {
  const endpoint = `/translations/${resourceType}/${resourceId}/${locale}`;
  const response = await getV2<{ data: TranslationResponseDto }>(endpoint, { environment });

  return response.data;
};

export const saveTranslation = async ({
  environment,
  resourceId,
  resourceType,
  locale,
  content,
}: SaveTranslationRequest & { environment: IEnvironment }): Promise<TranslationResponseDto> => {
  const endpoint = '/translations';
  const response = await postV2<{ data: TranslationResponseDto }>(endpoint, {
    body: { resourceId, resourceType, locale, content },
    environment,
  });

  return response.data;
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

export const deleteTranslationGroup = async ({
  environment,
  resourceId,
  resourceType,
}: DeleteTranslationGroupRequest & { environment: IEnvironment }): Promise<void> => {
  const endpoint = `/translations/${resourceType}/${resourceId}`;

  await delV2(endpoint, { environment });
};

export const uploadTranslations = async ({
  environment,
  resourceId,
  resourceType,
  files,
}: UploadTranslationsRequest & { environment: IEnvironment }): Promise<UploadTranslationsResponseDto> => {
  const formData = new FormData();
  formData.append('resourceId', resourceId);
  formData.append('resourceType', resourceType);

  for (const file of files) {
    formData.append('files', file);
  }

  const endpoint = '/translations/upload';
  const response = await postV2<{ data: UploadTranslationsResponseDto }>(endpoint, {
    body: formData,
    environment,
  });

  return response.data;
};

export const getMasterJson = async ({
  environment,
  locale,
}: {
  environment: IEnvironment;
  locale: string;
}): Promise<GetMasterJsonResponseDto> => {
  const searchParams = new URLSearchParams();
  searchParams.append('locale', locale);

  const endpoint = `/translations/master-json?${searchParams.toString()}`;
  const response = await getV2<{ data: GetMasterJsonResponseDto }>(endpoint, { environment });

  return response.data;
};

export const uploadMasterJson = async ({
  environment,
  file,
}: UploadMasterJsonRequest & { environment: IEnvironment }): Promise<ImportMasterJsonResponseDto> => {
  const formData = new FormData();
  formData.append('file', file);

  const endpoint = '/translations/master-json/upload';
  const response = await postV2<{ data: ImportMasterJsonResponseDto }>(endpoint, {
    body: formData,
    environment,
  });

  return response.data;
};
