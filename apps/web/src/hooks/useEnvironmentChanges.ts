import { useQuery } from '@tanstack/react-query';

import { useEnvController } from './useEnvController';

import { getPromotedChanges, getUnpromotedChanges } from '../api/changes';
import { QueryKeys } from '../api/query.keys';

export function usePromotedChanges(page = 0, limit = 10) {
  const { environment } = useEnvController();
  const {
    data,
    isLoading: isLoadingHistory,
    refetch: refetchHistory,
  } = useQuery(
    [QueryKeys.currentPromotedChanges, environment?._id, page, limit],
    () => getPromotedChanges(page, limit),
    {
      keepPreviousData: true,
    }
  );

  return {
    isLoadingHistory,
    history: data?.data,
    totalHistoryCount: data?.totalCount,
    historyPageSize: data?.pageSize,
    refetchHistory,
  };
}

export function useUnPromotedChanges(page = 0, limit = 10) {
  const { environment } = useEnvController();
  const {
    data,
    isLoading: isLoadingChanges,
    refetch: refetchChanges,
  } = useQuery(
    [QueryKeys.currentUnpromotedChanges, environment?._id, page, limit],
    () => getUnpromotedChanges(page, limit),
    {
      keepPreviousData: true,
    }
  );

  return {
    isLoadingChanges,
    changes: data?.data,
    totalChangesCount: data?.totalCount,
    changesPageSize: data?.pageSize,
    refetchChanges,
  };
}
