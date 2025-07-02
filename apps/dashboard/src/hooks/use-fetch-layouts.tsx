import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { DirectionEnum } from '@novu/shared';

import { QueryKeys } from '@/utils/query-keys';
import { useEnvironment } from '../context/environment/hooks';
import { getLayouts } from '@/api/layouts';

interface UseLayoutsParams {
  limit?: number;
  offset?: number;
  query?: string;
  orderBy?: string;
  orderDirection?: DirectionEnum;
}

export const useFetchLayouts = ({
  limit = 12,
  offset = 0,
  query = '',
  orderBy = '',
  orderDirection = DirectionEnum.DESC,
}: UseLayoutsParams = {}) => {
  const { currentEnvironment } = useEnvironment();

  const layoutsQuery = useQuery({
    queryKey: [QueryKeys.fetchLayouts, currentEnvironment?._id, { limit, offset, query, orderBy, orderDirection }],
    queryFn: () => getLayouts({ environment: currentEnvironment!, limit, offset, query, orderBy, orderDirection }),
    placeholderData: keepPreviousData,
    enabled: !!currentEnvironment?._id,
    refetchOnWindowFocus: true,
  });

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = layoutsQuery.data ? Math.ceil(layoutsQuery.data.totalCount / limit) : 0;

  return {
    ...layoutsQuery,
    currentPage,
    totalPages,
  };
};
