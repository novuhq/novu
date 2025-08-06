import { DirectionEnum } from '@novu/shared';
import { useCallback, useMemo } from 'react';
import { createSearchParams, useSearchParams } from 'react-router-dom';
import { ActivityFilters } from '@/api/activity';

export const defaultWorkflowRunsFilter: ActivityFilters = {
  channels: [],
  subscriberId: '',
  workflows: [],
};

// TODO: Consider merging this hook with useActivityUrlState/useSubscribersUrlState to reduce code duplication
export type WorkflowRunsUrlState = {
  filterValues: ActivityFilters;
  handleFiltersChange: (filters: ActivityFilters) => void;
  resetFilters: () => void;
};

export function useWorkflowRunsUrlState(): WorkflowRunsUrlState {
  const [searchParams, setSearchParams] = useSearchParams();

  const filterValues = useMemo(() => {
    const channels = searchParams.getAll('channels') || [];
    const subscriberId = searchParams.get('subscriberId') || '';
    const workflows = searchParams.getAll('workflows') || [];

    return {
      channels,
      subscriberId,
      workflows,
    };
  }, [searchParams]);

  const handleFiltersChange = useCallback(
    (filters: ActivityFilters) => {
      const params = new URLSearchParams(searchParams);

      params.delete('channels');

      if (filters.channels && filters.channels.length > 0) {
        filters.channels.forEach((channel) => params.append('channels', channel));
      }

      if (filters.subscriberId) {
        params.set('subscriberId', filters.subscriberId);
      } else {
        params.delete('subscriberId');
      }

      params.delete('workflows');

      if (filters.workflows && filters.workflows.length > 0) {
        filters.workflows.forEach((workflow) => params.append('workflows', workflow));
      }

      setSearchParams(params);
    },
    [searchParams, setSearchParams]
  );

  const resetFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams);
    params.delete('channels');
    params.delete('workflows');
    params.delete('subscriberId');
    setSearchParams(params);
  }, [searchParams, setSearchParams]);

  return {
    filterValues,
    handleFiltersChange,
    resetFilters,
  };
}
