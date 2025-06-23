import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

export function useLogsUrlState() {
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

  return {
    selectedLogId,
    handleLogSelect,
  };
}
