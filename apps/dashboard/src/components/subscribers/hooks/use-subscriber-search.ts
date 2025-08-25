import { DirectionEnum } from '@novu/shared';
import { useEffect, useState } from 'react';
import { useFetchSubscribers } from '@/hooks/use-fetch-subscribers';

export type SearchField = 'subscriberId' | 'email' | 'phone' | 'name';

export function useSubscriberSearch(searchQuery: string, searchField: SearchField = 'subscriberId', limit = 5) {
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchParams = {
    limit,
    orderBy: '_id',
    orderDirection: DirectionEnum.DESC,
  };

  if (searchField === 'name') {
    Object.assign(fetchParams, { name: debouncedQuery });
  } else if (searchField === 'email') {
    Object.assign(fetchParams, { email: debouncedQuery });
  } else if (searchField === 'phone') {
    Object.assign(fetchParams, { phone: debouncedQuery });
  } else {
    Object.assign(fetchParams, { subscriberId: debouncedQuery });
  }

  const { data, isError, isLoading, isFetching } = useFetchSubscribers(fetchParams, {
    enabled: debouncedQuery.length >= 2,
    staleTime: 0,
  });

  return {
    subscribers: data?.data || [],
    isLoading: isLoading || isFetching,
    isError,
    hasSearched: debouncedQuery.length >= 2,
  };
}
