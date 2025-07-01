import { ListLayoutsResponse, IEnvironment } from '@novu/shared';
import { getV2 } from './api.client';

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
