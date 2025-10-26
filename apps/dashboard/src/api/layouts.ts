import {
  CreateLayoutDto,
  GeneratePreviewResponseDto,
  IEnvironment,
  LayoutResponseDto,
  ListLayoutsResponse,
  UpdateLayoutDto,
} from '@novu/shared';
import { delV2, getV2, postV2, putV2 } from './api.client';

export type WorkflowInfo = {
  name: string;
  workflowId: string;
};

export type GetLayoutUsageResponse = {
  workflows: WorkflowInfo[];
};

export const getLayouts = async ({
  environment,
  limit,
  query,
  offset,
  orderBy,
  orderDirection,
}: {
  environment: IEnvironment;
  limit: number;
  offset: number;
  query: string;
  orderBy?: string;
  orderDirection?: string;
}): Promise<ListLayoutsResponse> => {
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
    query,
  });

  if (orderBy) {
    params.append('orderBy', orderBy);
  }

  if (orderDirection) {
    params.append('orderDirection', orderDirection.toUpperCase());
  }

  const { data } = await getV2<{ data: ListLayoutsResponse }>(`/layouts?${params.toString()}`, { environment });

  return data;
};

export const createLayout = async ({ environment, layout }: { environment: IEnvironment; layout: CreateLayoutDto }) => {
  const { data } = await postV2<{ data: LayoutResponseDto }>(`/layouts`, { environment, body: layout });

  return data;
};

export const getLayout = async ({ environment, layoutSlug }: { environment: IEnvironment; layoutSlug: string }) => {
  const { data } = await getV2<{ data: LayoutResponseDto }>(`/layouts/${layoutSlug}`, { environment });

  return data;
};

export const updateLayout = async ({
  environment,
  layout,
  layoutSlug,
}: {
  environment: IEnvironment;
  layout: UpdateLayoutDto;
  layoutSlug: string;
}) => {
  const { data } = await putV2<{ data: LayoutResponseDto }>(`/layouts/${layoutSlug}`, { environment, body: layout });

  return data;
};

export const deleteLayout = async ({ environment, layoutSlug }: { environment: IEnvironment; layoutSlug: string }) => {
  await delV2(`/layouts/${layoutSlug}`, { environment });
};

export const duplicateLayout = async ({
  environment,
  layoutSlug,
  data,
}: {
  environment: IEnvironment;
  layoutSlug: string;
  data: { name: string; isTranslationEnabled: boolean };
}) => {
  const { data: result } = await postV2<{ data: LayoutResponseDto }>(`/layouts/${layoutSlug}/duplicate`, {
    environment,
    body: data,
  });

  return result;
};

export const getLayoutUsage = async ({
  environment,
  layoutSlug,
}: {
  environment: IEnvironment;
  layoutSlug: string;
}): Promise<GetLayoutUsageResponse> => {
  const { data } = await getV2<{ data: GetLayoutUsageResponse }>(`/layouts/${layoutSlug}/usage`, { environment });

  return data;
};

export const previewLayout = async ({
  environment,
  layoutSlug,
  previewData,
  signal,
}: {
  environment: IEnvironment;
  layoutSlug: string;
  previewData: { controlValues: Record<string, unknown>; previewPayload: Record<string, unknown> };
  signal?: AbortSignal;
}) => {
  const { data } = await postV2<{ data: GeneratePreviewResponseDto }>(`/layouts/${layoutSlug}/preview`, {
    environment,
    body: previewData,
    signal,
  });

  return data;
};
