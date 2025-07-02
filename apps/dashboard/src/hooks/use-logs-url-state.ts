import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getMaxAvailableLogsDateRange } from '@/utils/logs-filters.utils';
import { useFetchSubscription } from '@/hooks/use-fetch-subscription';
import { useOrganization } from '@clerk/clerk-react';

export interface LogsFilters {
  status: string[];
  transactionId: string;
  created: string; // Hours value for creation time filter, defaults to '24'
}

export interface LogsUrlState {
  selectedLogId: string | null;
  handleLogSelect: (logId: string) => void;
  currentPage: number;
  limit: number;
  handleNext: () => void;
  handlePrevious: () => void;
  handleFirst: () => void;
  filters: LogsFilters;
  handleFiltersChange: (newFilters: LogsFilters) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
}

export function useLogsUrlState(): LogsUrlState {
  const [searchParams, setSearchParams] = useSearchParams();
  const { organization } = useOrganization();
  const { subscription } = useFetchSubscription();
  const selectedLogId = searchParams.get('selectedLogId');

  const maxAvailableLogsDateRange = useMemo(
    () =>
      getMaxAvailableLogsDateRange({
        organization,
        subscription,
      }),
    [organization, subscription]
  );

  const handleLogSelect = useCallback(
    (logId: string) => {
      const newParams = new URLSearchParams(searchParams);

      if (logId === selectedLogId) {
        newParams.delete('selectedLogId');
      } else {
        newParams.set('selectedLogId', logId);
      }

      setSearchParams(newParams, { replace: true });
    },
    [selectedLogId, searchParams, setSearchParams]
  );

  // Pagination state
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);

  const handleNext = useCallback(() => {
    setSearchParams((prev) => {
      prev.set('page', (currentPage + 1).toString());
      return prev;
    });
  }, [currentPage, setSearchParams]);

  const handlePrevious = useCallback(() => {
    setSearchParams((prev) => {
      prev.set('page', (currentPage - 1).toString());
      return prev;
    });
  }, [currentPage, setSearchParams]);

  const handleFirst = useCallback(() => {
    setSearchParams((prev) => {
      prev.delete('page');
      return prev;
    });
  }, [setSearchParams]);

  // Filter state
  const filters = useMemo(
    (): LogsFilters => ({
      status: searchParams.getAll('status'),
      transactionId: searchParams.get('transactionId') || '',
      created: searchParams.get('created') || maxAvailableLogsDateRange, // Default to max available for user's tier
    }),
    [searchParams, maxAvailableLogsDateRange]
  );

  const handleFiltersChange = useCallback(
    (newFilters: LogsFilters) => {
      setSearchParams((prev) => {
        // Clear existing filter params
        prev.delete('status');
        prev.delete('transactionId');
        prev.delete('created');

        // Set new filter params
        if (newFilters.status.length > 0) {
          newFilters.status.forEach((status) => prev.append('status', status));
        }

        if (newFilters.transactionId.trim()) {
          prev.set('transactionId', newFilters.transactionId);
        }

        if (newFilters.created) {
          prev.set('created', newFilters.created);
        }

        // Reset to first page when filters change
        prev.delete('page');

        return prev;
      });
    },
    [setSearchParams]
  );

  const clearFilters = useCallback(() => {
    setSearchParams((prev) => {
      prev.delete('status');
      prev.delete('transactionId');
      prev.delete('created'); // Remove from URL so it defaults to '24'
      prev.delete('page');
      return prev;
    });
  }, [setSearchParams]);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.status.length > 0 || filters.transactionId.trim() !== '' || filters.created !== maxAvailableLogsDateRange
    );
  }, [filters, maxAvailableLogsDateRange]);

  return useMemo(
    () => ({
      selectedLogId,
      handleLogSelect,
      currentPage,
      limit,
      handleNext,
      handlePrevious,
      handleFirst,
      filters,
      handleFiltersChange,
      clearFilters,
      hasActiveFilters,
    }),
    [
      selectedLogId,
      handleLogSelect,
      currentPage,
      limit,
      handleNext,
      handlePrevious,
      handleFirst,
      filters,
      handleFiltersChange,
      clearFilters,
      hasActiveFilters,
    ]
  );
}
