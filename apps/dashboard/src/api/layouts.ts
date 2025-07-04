import { ListLayoutsResponse, IEnvironment, CreateLayoutDto, LayoutResponseDto } from '@novu/shared';
import { getV2, postV2 } from './api.client';

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
