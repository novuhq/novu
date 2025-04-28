import { useFetchSubscribers } from '@/hooks/use-fetch-subscribers';
import { DirectionEnum } from '@novu/shared';
import { useEffect, useState } from 'react';

export function useSubscriberSearch(searchQuery: string, limit = 5) {
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data, isError, isLoading, isFetching } = useFetchSubscribers(
    {
      name: debouncedQuery,
      limit,
      orderBy: '_id',
      orderDirection: DirectionEnum.DESC,
      subscriberId: debouncedQuery,
      email: debouncedQuery,
    },
    {
      enabled: debouncedQuery.length >= 2,
    }
  );

  return {
    subscribers: data?.data || [],
    isLoading: isLoading || isFetching,
    isError,
    hasSearched: debouncedQuery.length >= 2,
  };
}
