import { useMemo } from 'react';

import { useTemplates } from './useTemplates';

export function useFilterTemplates(searchQuery = '', page = 0) {
  const {
    templates: tempData,
    loading: isTempLoading,
    totalCount: tempTotalCount,
    pageSize: tempPageSize,
  } = useTemplates(page);

  const {
    templates: data,
    loading: isLoading,
    totalCount,
    pageSize,
  } = useTemplates(0, isTempLoading ? 10 : tempTotalCount);

  const filteredData = useMemo(() => {
    return data
      ?.filter((template) => template.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data, searchQuery]);

  const paginatedData = filteredData?.slice(page * 10, (page + 1) * 10);

  if (searchQuery === '' || isTempLoading)
    return {
      templates: tempData,
      loading: isTempLoading,
      totalCount: tempTotalCount,
      pageSize: tempPageSize,
    };

  return {
    templates: paginatedData,
    loading: isLoading && isTempLoading,
    totalCount: totalCount,
    pageSize: pageSize,
  };
}
