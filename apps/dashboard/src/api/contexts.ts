import type { ContextData, ContextId, ContextType, DirectionEnum, IEnvironment } from '@novu/shared';
import { delV2, getV2, patchV2, postV2 } from './api.client';

export type ContextResponseDto = {
  id: ContextId;
  type: ContextType;
  data: ContextData;
  createdAt: string;
  updatedAt: string;
};

export type ListContextsResponse = {
  data: Array<ContextResponseDto>;
  next: string | null;
  previous: string | null;
  totalCount: number;
  totalCountCapped: boolean;
};

export const getContexts = async ({
  environment,
  limit = 10,
  after,
  before,
  orderDirection,
  orderBy = 'createdAt',
  includeCursor,
  type,
  id,
  search,
}: {
  environment: IEnvironment;
  limit?: number;
  after?: string;
  before?: string;
  orderDirection?: DirectionEnum;
  orderBy?: 'createdAt' | 'updatedAt';
  includeCursor?: boolean;
  type?: ContextType;
  id?: ContextId;
  search?: string;
}): Promise<ListContextsResponse> => {
  const params = new URLSearchParams();

  // Add pagination and ordering parameters
  params.append('limit', limit.toString());

  if (after) {
    params.append('after', after);
  }

  if (before) {
    params.append('before', before);
  }

  if (orderDirection) {
    params.append('orderDirection', orderDirection);
  }

  if (orderBy) {
    params.append('orderBy', orderBy);
  }

  if (includeCursor !== undefined) {
    params.append('includeCursor', includeCursor.toString());
  }

  if (type) {
    params.append('type', type);
  }

  if (id) {
    params.append('id', id);
  }

  if (search) {
    params.append('search', search);
  }

  const response = await getV2<ListContextsResponse>(`/contexts?${params.toString()}`, {
    environment,
  });

  return response;
};

export const getContext = async ({
  environment,
  type,
  id,
}: {
  environment: IEnvironment;
  type: ContextType;
  id: ContextId;
}): Promise<ContextResponseDto> => {
  const { data } = await getV2<{ data: ContextResponseDto }>(`/contexts/${type}/${id}`, {
    environment,
  });

  return data;
};

export const createContext = async ({
  environment,
  type,
  id,
  data,
}: {
  environment: IEnvironment;
  type: ContextType;
  id: ContextId;
  data?: ContextData;
}): Promise<ContextResponseDto> => {
  const { data: responseData } = await postV2<{ data: ContextResponseDto }>(`/contexts`, {
    environment,
    body: { type, id, data },
  });

  return responseData;
};

export const updateContext = async ({
  environment,
  type,
  id,
  data,
}: {
  environment: IEnvironment;
  type: ContextType;
  id: ContextId;
  data: ContextData;
}): Promise<ContextResponseDto> => {
  const { data: responseData } = await patchV2<{ data: ContextResponseDto }>(`/contexts/${type}/${id}`, {
    environment,
    body: { data },
  });

  return responseData;
};

export const deleteContext = async ({
  environment,
  type,
  id,
}: {
  environment: IEnvironment;
  type: ContextType;
  id: ContextId;
}): Promise<void> => {
  await delV2(`/contexts/${type}/${id}`, {
    environment,
  });
};
