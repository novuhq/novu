import { DirectionEnum } from '@novu/shared';
import { useCallback, useMemo } from 'react';
import { createSearchParams, useSearchParams } from 'react-router-dom';

export type WorkflowRunsFilter = {
  search?: string;
  status?: string[];
  company?: string;
  timePeriod?: string;
  channels?: string[];
  transactionId?: string;
  subscriberId?: string;
};

export type WorkflowRunsSortableColumn = 'timestamp' | 'name' | 'status';

export const defaultWorkflowRunsFilter: WorkflowRunsFilter = {
  search: '',
  status: [],
  company: '',
  timePeriod: '24h',
  channels: [],
  transactionId: '',
  subscriberId: '',
};

// TODO: Consider merging this hook with useActivityUrlState/useSubscribersUrlState to reduce code duplication
export type WorkflowRunsUrlState = {
  filterValues: WorkflowRunsFilter;
  handleFiltersChange: (filters: WorkflowRunsFilter) => void;
  resetFilters: () => void;
  orderBy?: WorkflowRunsSortableColumn;
  orderDirection?: DirectionEnum;
  toggleSort: (column: WorkflowRunsSortableColumn) => void;
};

export function useWorkflowRunsUrlState(): WorkflowRunsUrlState {
  const [searchParams, setSearchParams] = useSearchParams();

  const filterValues = useMemo(() => {
    const search = searchParams.get('search') || '';
    const status = searchParams.getAll('status') || [];
    const company = searchParams.get('company') || '';
    const timePeriod = searchParams.get('timePeriod') || '24h';
    const channels = searchParams.getAll('channels') || [];
    const transactionId = searchParams.get('transactionId') || '';
    const subscriberId = searchParams.get('subscriberId') || '';

    return {
      search,
      status,
      company,
      timePeriod,
      channels,
      transactionId,
      subscriberId,
    };
  }, [searchParams]);

  const orderBy = (searchParams.get('orderBy') as WorkflowRunsSortableColumn) || undefined;
  const orderDirection = (searchParams.get('orderDirection') as DirectionEnum) || DirectionEnum.DESC;

  const handleFiltersChange = useCallback(
    (filters: WorkflowRunsFilter) => {
      const params = new URLSearchParams(searchParams);

      // Handle search
      if (filters.search) {
        params.set('search', filters.search);
      } else {
        params.delete('search');
      }

      // Handle status
      params.delete('status');

      if (filters.status && filters.status.length > 0) {
        filters.status.forEach((status) => params.append('status', status));
      }

      // Handle company
      if (filters.company) {
        params.set('company', filters.company);
      } else {
        params.delete('company');
      }

      // Handle timePeriod
      if (filters.timePeriod) {
        params.set('timePeriod', filters.timePeriod);
      } else {
        params.delete('timePeriod');
      }

      // Handle channels
      params.delete('channels');

      if (filters.channels && filters.channels.length > 0) {
        filters.channels.forEach((channel) => params.append('channels', channel));
      }

      // Handle transactionId
      if (filters.transactionId) {
        params.set('transactionId', filters.transactionId);
      } else {
        params.delete('transactionId');
      }

      // Handle subscriberId
      if (filters.subscriberId) {
        params.set('subscriberId', filters.subscriberId);
      } else {
        params.delete('subscriberId');
      }

      setSearchParams(params);
    },
    [searchParams, setSearchParams]
  );

  const resetFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams);
    params.delete('search');
    params.delete('status');
    params.delete('company');
    params.set('timePeriod', defaultWorkflowRunsFilter.timePeriod || '24h');
    params.delete('channels');
    params.delete('transactionId');
    params.delete('subscriberId');
    setSearchParams(params);
  }, [searchParams, setSearchParams]);

  const toggleSort = useCallback(
    (column: WorkflowRunsSortableColumn) => {
      const params = createSearchParams(searchParams);

      if (orderBy === column) {
        // Toggle direction
        const newDirection = orderDirection === DirectionEnum.ASC ? DirectionEnum.DESC : DirectionEnum.ASC;
        params.set('orderDirection', newDirection);
      } else {
        // Set new column with default direction
        params.set('orderBy', column);
        params.set('orderDirection', DirectionEnum.DESC);
      }

      setSearchParams(params);
    },
    [orderBy, orderDirection, searchParams, setSearchParams]
  );

  return {
    filterValues,
    handleFiltersChange,
    resetFilters,
    orderBy,
    orderDirection,
    toggleSort,
  };
}
