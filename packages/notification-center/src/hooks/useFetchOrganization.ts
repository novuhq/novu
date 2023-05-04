import { useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { IOrganizationEntity } from '@novu/shared';

import { useNovuContext } from './useNovuContext';
import { FEED_UNSEEN_COUNT_QUERY_KEY, ORGANIZATION_QUERY_KEY, UNSEEN_COUNT_QUERY_KEY } from './queryKeys';
import { useEffect, useState } from 'react';

export const useFetchOrganization = (
  options: UseQueryOptions<IOrganizationEntity, Error, IOrganizationEntity> = {}
) => {
  const { apiService, isSessionInitialized, fetchingStrategy, subscriberId, applicationIdentifier } = useNovuContext();
  const [intialize, setInitialize] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (intialize) {
      queryClient.refetchQueries(UNSEEN_COUNT_QUERY_KEY, { exact: false });
      queryClient.refetchQueries(FEED_UNSEEN_COUNT_QUERY_KEY, { exact: false });
      queryClient.refetchQueries(ORGANIZATION_QUERY_KEY, { exact: false });
    }
  }, [subscriberId, applicationIdentifier]);

  const result = useQuery<IOrganizationEntity, Error, IOrganizationEntity>(
    ORGANIZATION_QUERY_KEY,
    () => {
      setInitialize(true);

      return apiService.getOrganization();
    },
    {
      ...options,
      enabled: isSessionInitialized && fetchingStrategy.fetchOrganization,
    }
  );

  return result;
};
