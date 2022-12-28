import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { IOrganizationEntity } from '@novu/shared';

import { useNovuContext } from './use-novu-context.hook';
import { ORGANIZATION_QUERY_KEY } from './queryKeys';

export const useFetchOrganization = (
  options: UseQueryOptions<IOrganizationEntity, Error, IOrganizationEntity> = {}
) => {
  const { apiService, isSessionInitialized } = useNovuContext();

  const result = useQuery<IOrganizationEntity, Error, IOrganizationEntity>(
    ORGANIZATION_QUERY_KEY,
    () => apiService.getOrganization(),
    {
      ...options,
      enabled: isSessionInitialized,
    }
  );

  return result;
};
