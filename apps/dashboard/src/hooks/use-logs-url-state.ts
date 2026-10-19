import { useOrganization } from '@clerk/react';
import { useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useFetchSubscription } from '@/hooks/use-fetch-subscription';
import { getPersistedPageSize, usePersistedPageSize } from '@/hooks/use-persisted-page-size';
import { getMaxAvailableLogsDateRange } from '@/utils/logs-filters.utils';

const LOGS_TABLE_ID = 'logs-table';

export interface LogsFilters {
  status: string[];
  transactionId: string;
  urlPattern: string;
  createdGte: string; // Timestamp string for creation time filter, defaults to calculated timestamp based on max available range
  source: string; // Request origin filter ('http' | 'inbound_email'); empty means all sources
}

export interface LogsUrlState {
  selectedLogId: string | null;
  handleLogSelect: (logId: string) => void;
  currentPage: number;
  limit: number;
  handleNext: () => void;
  handlePrevious: () => void;
  handleFirst: () => void;
  handlePageSizeChange: (newLimit: number) => void;
  filters: LogsFilters;
  handleFiltersChange: (newFilters: LogsFilters) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
}

type UseLogsUrlStateOptions = {
  isSourceFilterEnabled?: boolean;
};

export function useLogsUrlState({ isSourceFilterEnabled = true }: UseLogsUrlStateOptions = {}): LogsUrlState {
  const [searchParams, setSearchParams] = useSearchParams();
  const { organization } = useOrganization();
  const { subscription } = useFetchSubscription();
  const selectedLogId = searchParams.get('selectedLogId');
  const { setPageSize: setPersistedPageSize } = usePersistedPageSize({
    tableId: LOGS_TABLE_ID,
    defaultPageSize: 20,
  });

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

  const defaultLimit = getPersistedPageSize(LOGS_TABLE_ID, 20);

  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || defaultLimit.toString(), 10);

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

  const handlePageSizeChange = useCallback(
    (newLimit: number) => {
      setPersistedPageSize(newLimit);
      setSearchParams((prev) => {
        prev.set('limit', newLimit.toString());
        prev.delete('page');

        return prev;
      });
    },
    [setSearchParams, setPersistedPageSize]
  );

  // Filter state
  const filters = useMemo(
    (): LogsFilters => ({
      status: searchParams.getAll('status'),
      transactionId: searchParams.get('transactionId') || '',
      urlPattern: searchParams.get('urlPattern') || '',
      createdGte: searchParams.get('createdGte') || maxAvailableLogsDateRange, // Default to max available for user's tier
      source: searchParams.get('source') || '',
    }),
    [searchParams, maxAvailableLogsDateRange]
  );

  const handleFiltersChange = useCallback(
    (newFilters: LogsFilters) => {
      setSearchParams((prev) => {
        // Clear existing filter params
        prev.delete('status');
        prev.delete('transactionId');
        prev.delete('urlPattern');
        prev.delete('createdGte');
        prev.delete('source');

        // Set new filter params
        if (newFilters.status.length > 0) {
          for (const status of newFilters.status) {
            prev.append('status', status);
          }
        }

        if (newFilters.transactionId.trim()) {
          prev.set('transactionId', newFilters.transactionId);
        }

        if (newFilters.createdGte) {
          prev.set('createdGte', newFilters.createdGte);
        }

        if (newFilters.urlPattern.trim()) {
          prev.set('urlPattern', newFilters.urlPattern);
        }

        if (newFilters.source?.trim()) {
          prev.set('source', newFilters.source);
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
      prev.delete('urlPattern');
      prev.delete('createdGte'); // Remove from URL so it uses default date range
      prev.delete('source');
      prev.delete('page');
      return prev;
    });
  }, [setSearchParams]);

  useEffect(() => {
    if (isSourceFilterEnabled || filters.source.trim() === '') {
      return;
    }

    setSearchParams((prev) => {
      prev.delete('source');

      return prev;
    });
  }, [isSourceFilterEnabled, filters.source, setSearchParams]);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.status.length > 0 ||
      filters.transactionId.trim() !== '' ||
      filters.createdGte !== maxAvailableLogsDateRange ||
      filters.urlPattern.trim() !== '' ||
      (isSourceFilterEnabled && filters.source.trim() !== '')
    );
  }, [filters, maxAvailableLogsDateRange, isSourceFilterEnabled]);

  return useMemo(
    () => ({
      selectedLogId,
      handleLogSelect,
      currentPage,
      limit,
      handleNext,
      handlePrevious,
      handleFirst,
      handlePageSizeChange,
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
      handlePageSizeChange,
      filters,
      handleFiltersChange,
      clearFilters,
      hasActiveFilters,
    ]
  );
}
