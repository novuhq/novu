import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

export interface LogsUrlState {
  selectedLogId: string | null;
  handleLogSelect: (logId: string) => void;
  currentPage: number;
  limit: number;
  handleNext: () => void;
  handlePrevious: () => void;
  handleFirst: () => void;
}

export function useLogsUrlState(): LogsUrlState {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedLogId = searchParams.get('selectedLogId');

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

  return useMemo(
    () => ({
      selectedLogId,
      handleLogSelect,
      currentPage,
      limit,
      handleNext,
      handlePrevious,
      handleFirst,
    }),
    [selectedLogId, handleLogSelect, currentPage, limit, handleNext, handlePrevious, handleFirst]
  );
}
