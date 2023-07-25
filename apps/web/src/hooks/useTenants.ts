import { UseQueryOptions, useQuery } from '@tanstack/react-query';

import { ITenantEntity } from '@novu/shared';

import { QueryKeys } from '../api/query.keys';
import { getTenants } from '../api/tenants';

export function useTenants(options: UseQueryOptions<ITenantEntity[], any, ITenantEntity[]> = {}) {
  const { data, isLoading, ...rest } = useQuery<ITenantEntity[], any, ITenantEntity[]>(
    [QueryKeys.tenantsList],
    getTenants,
    { refetchOnMount: false, ...options }
  );

  return {
    tenants: data,
    loading: isLoading,
    ...rest,
  };
}
