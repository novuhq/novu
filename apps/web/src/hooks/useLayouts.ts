import { useQuery } from '@tanstack/react-query';
import { ILayoutEntity } from '@novu/shared';

import { useEnvController } from './useEnvController';

import { QueryKeys } from '../api/query.keys';
import { getLayoutsList } from '../api/layouts';

export function useLayouts(page = 0, pageSize = 10) {
  const { environment } = useEnvController();
  const { data, isLoading, refetch } = useQuery<{
    data: ILayoutEntity[];
    totalCount: number;
    pageSize: number;
  }>([QueryKeys.getLayoutsList, environment?._id, page, pageSize], () => getLayoutsList(page, pageSize), {
    keepPreviousData: true,
  });

  return {
    layouts: data?.data,
    isLoading,
    totalCount: data?.totalCount,
    pageSize: data?.pageSize,
    refetchLayouts: refetch,
  };
}
