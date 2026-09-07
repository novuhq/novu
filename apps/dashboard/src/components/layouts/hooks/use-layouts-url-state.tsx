import { DirectionEnum } from '@novu/shared';
import { useCallback, useMemo } from 'react';
import { createSearchParams, useSearchParams } from 'react-router-dom';
import { getPersistedPageSize } from '@/hooks/use-persisted-page-size';

const LAYOUTS_TABLE_ID = 'layouts-list';

export type LayoutsSortableColumn = 'name' | 'createdAt' | 'updatedAt';

export type LayoutsFilter = {
  query: string;
  orderBy: LayoutsSortableColumn;
  orderDirection: DirectionEnum;
  offset: number;
  limit: number;
};

export const defaultLayoutsFilter: LayoutsFilter = {
  query: '',
  orderBy: 'createdAt',
  orderDirection: DirectionEnum.DESC,
  offset: 0,
  limit: getPersistedPageSize(LAYOUTS_TABLE_ID, 10),
};

export type LayoutsUrlState = {
  filterValues: LayoutsFilter;
  hrefFromOffset: (offset: number) => string;
  handleFiltersChange: (newFilters: Partial<LayoutsFilter>) => void;
  toggleSort: (column: LayoutsSortableColumn) => void;
  resetFilters: () => void;
};

export const useLayoutsUrlState = (): LayoutsUrlState => {
  const [searchParams, setSearchParams] = useSearchParams();

  const filterValues = useMemo(() => {
    const offset = parseInt(searchParams.get('offset') || defaultLayoutsFilter.offset.toString());
    const limit = parseInt(searchParams.get('limit') || defaultLayoutsFilter.limit.toString());
    const query = searchParams.get('query') || '';
    const orderBy = searchParams.get('orderBy') as LayoutsSortableColumn;
    const orderDirection = searchParams.get('orderDirection') as DirectionEnum;

    return {
      query,
      orderBy: orderBy || defaultLayoutsFilter.orderBy,
      orderDirection: orderDirection || defaultLayoutsFilter.orderDirection,
      offset,
      limit,
    };
  }, [searchParams]);

  const handleFiltersChange = useCallback(
    (newFilters: Partial<LayoutsFilter>) => {
      setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev);

        Object.entries(newFilters).forEach(([key, value]) => {
          if (value === '' || value === undefined) {
            newParams.delete(key);
          } else {
            newParams.set(key, String(value));
          }
        });

        // Remove pagination when filters change
        newParams.delete('before');
        newParams.delete('after');

        return newParams;
      });
    },
    [setSearchParams]
  );

  const toggleSort = useCallback(
    (column: LayoutsSortableColumn) => {
      const currentDirection = filterValues.orderDirection;
      const isCurrentColumn = filterValues.orderBy === column;

      const newDirection = isCurrentColumn
        ? currentDirection === DirectionEnum.ASC
          ? DirectionEnum.DESC
          : DirectionEnum.ASC
        : DirectionEnum.DESC;

      handleFiltersChange({
        orderBy: column,
        orderDirection: newDirection,
      });
    },
    [filterValues.orderBy, filterValues.orderDirection, handleFiltersChange]
  );

  const resetFilters = useCallback(() => {
    setSearchParams({});
  }, [setSearchParams]);

  const hrefFromOffset = (offset: number) => {
    return `${location.pathname}?${createSearchParams({
      ...searchParams,
      offset: offset.toString(),
    })}`;
  };

  return {
    filterValues,
    hrefFromOffset,
    handleFiltersChange,
    toggleSort,
    resetFilters,
  };
};
