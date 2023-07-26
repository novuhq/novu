import { UseQueryOptions, useQuery } from '@tanstack/react-query';

import { IPaginatedResponseDto, ITenantEntity } from '@novu/shared';

import { QueryKeys } from '../api/query.keys';
import { getTenants } from '../api/tenants';
import { useEnvController } from './useEnvController';

export function useTenants({
  options,
  page,
  limit,
}: {
  options?: UseQueryOptions<IPaginatedResponseDto<ITenantEntity>, any>;
  page?: number;
  limit?: number;
}) {
  const { environment } = useEnvController();
  const { data, isLoading, ...rest } = useQuery<IPaginatedResponseDto<ITenantEntity>, any>(
    [QueryKeys.tenantsList, environment?._id, page, limit],

    () => getTenants({ page, limit }),
    {
      refetchOnMount: false,
      keepPreviousData: true,
      ...options,
    }
  );

  return {
    tenants: data?.data,
    hasMore: data?.hasMore,
    page: data?.page,
    pageSize: data?.pageSize,
    loading: isLoading,
    ...rest,
  };
}
