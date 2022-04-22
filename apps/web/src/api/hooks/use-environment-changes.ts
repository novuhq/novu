import { useQuery } from 'react-query';
import { useEnvController } from '../../store/use-env-controller';
import { getPromotedChanges, getUnpromotedChanges } from '../changes';
import { QueryKeys } from '../query.keys';

export function useEnvironmentChanges() {
  const { environment } = useEnvController();
  const {
    data: changes,
    isLoading: isLoadingChanges,
    refetch: refetchChanges,
  } = useQuery([QueryKeys.currentUnpromotedChanges, environment], getUnpromotedChanges, {});

  const {
    data: history,
    isLoading: isLoadingHistory,
    refetch: refetchHistory,
  } = useQuery([QueryKeys.currentPromotedChanges, environment], getPromotedChanges, {});

  return {
    changes,
    isLoadingChanges,
    refetchChanges,
    history,
    isLoadingHistory,
    refetchHistory,
  };
}
