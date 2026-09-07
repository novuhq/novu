import { DirectionEnum } from '@novu/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getLayouts } from '@/api/layouts';
import { QueryKeys } from '@/utils/query-keys';
import { useEnvironment } from '../context/environment/hooks';

interface UseLayoutsParams {
  limit?: number;
  offset?: number;
  query?: string;
  orderBy?: string;
  orderDirection?: DirectionEnum;
  refetchOnWindowFocus?: boolean;
}

export const useFetchLayouts = ({
  limit = 10,
  offset = 0,
  query = '',
  orderBy = '',
  orderDirection = DirectionEnum.DESC,
  refetchOnWindowFocus = true,
}: UseLayoutsParams = {}) => {
  const { currentEnvironment } = useEnvironment();
  const environmentId = currentEnvironment?._id;
  const params = { limit, offset, query, orderBy, orderDirection };

  const layoutsQuery = useQuery({
    queryKey: [QueryKeys.fetchLayouts, environmentId, params],
    queryFn: () => getLayouts({ environment: currentEnvironment!, ...params }),
    placeholderData: keepPreviousData,
    enabled: !!environmentId,
    refetchOnWindowFocus,
  });

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = layoutsQuery.data ? Math.ceil(layoutsQuery.data.totalCount / limit) : 0;

  return {
    ...layoutsQuery,
    currentPage,
    totalPages,
  };
};
