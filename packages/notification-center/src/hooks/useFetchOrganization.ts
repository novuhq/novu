import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { IOrganizationEntity } from '@novu/shared';

import { useNovuContext } from './useNovuContext';
import { ORGANIZATION_QUERY_KEY } from './queryKeys';

export const useFetchOrganization = (
  options: UseQueryOptions<IOrganizationEntity, Error, IOrganizationEntity> = {}
) => {
  const { apiService, isSessionInitialized, fetchingStrategy } = useNovuContext();

  const result = useQuery<IOrganizationEntity, Error, IOrganizationEntity>(
    ORGANIZATION_QUERY_KEY,
    () => apiService.getOrganization(),
    {
      ...options,
      enabled: isSessionInitialized && fetchingStrategy.fetchOrganization,
    }
  );

  return result;
};
