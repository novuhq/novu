import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { MintlifySearchResult, searchDocs } from '@/api/docs-assistant';

const DOCS_SEARCH_QUERY_KEY = 'docs-assistant-search';

export function useMintlifyDocsSearch(query: string, enabled = true) {
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(query);
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [query]);

  const trimmedQuery = debouncedQuery.trim();
  const isEnabled = enabled && trimmedQuery.length > 0;

  const { data, isFetching, error } = useQuery({
    queryKey: [DOCS_SEARCH_QUERY_KEY, trimmedQuery],
    queryFn: () => searchDocs(trimmedQuery),
    enabled: isEnabled,
    staleTime: 60_000,
  });

  return {
    results: (data ?? []) as MintlifySearchResult[],
    isSearching: isFetching,
    hasQuery: trimmedQuery.length > 0,
    error,
  };
}
