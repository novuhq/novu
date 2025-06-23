import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DirectionEnum } from '@novu/shared';

export type LayoutsSortableColumn = 'createdAt' | 'updatedAt';

export type LayoutsFilter = {
  query: string;
  orderBy?: LayoutsSortableColumn;
  orderDirection?: DirectionEnum;
  before?: string;
  after?: string;
};

export const defaultLayoutsFilter: LayoutsFilter = {
  query: '',
  orderBy: 'createdAt',
  orderDirection: DirectionEnum.DESC,
};

export type LayoutsUrlState = {
  filterValues: LayoutsFilter;
  handleFiltersChange: (newFilters: Partial<LayoutsFilter>) => void;
  toggleSort: (column: LayoutsSortableColumn) => void;
  resetFilters: () => void;
  handleNext: () => void;
  handlePrevious: () => void;
  handleFirst: () => void;
  handleNavigationAfterDelete: (afterCursor: string) => void;
};

type UseLayoutsUrlStateProps = {
  after?: string;
  before?: string;
};

export const useLayoutsUrlState = ({ after, before }: UseLayoutsUrlStateProps): LayoutsUrlState => {
  const [searchParams, setSearchParams] = useSearchParams();

  const filterValues = useMemo(() => {
    const query = searchParams.get('query') || '';
    const orderBy = searchParams.get('orderBy') as LayoutsSortableColumn;
    const orderDirection = searchParams.get('orderDirection') as DirectionEnum;

    return {
      query,
      orderBy: orderBy || defaultLayoutsFilter.orderBy,
      orderDirection: orderDirection || defaultLayoutsFilter.orderDirection,
      before: searchParams.get('before') || undefined,
      after: searchParams.get('after') || undefined,
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

  const handleNext = useCallback(() => {
    if (after) {
      setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev);
        newParams.set('after', after);
        newParams.delete('before');
        return newParams;
      });
    }
  }, [after, setSearchParams]);

  const handlePrevious = useCallback(() => {
    if (before) {
      setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev);
        newParams.set('before', before);
        newParams.delete('after');
        return newParams;
      });
    }
  }, [before, setSearchParams]);

  const handleFirst = useCallback(() => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      newParams.delete('after');
      newParams.delete('before');
      return newParams;
    });
  }, [setSearchParams]);

  const handleNavigationAfterDelete = useCallback(
    (afterCursor: string) => {
      setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev);
        newParams.set('after', afterCursor);
        newParams.delete('before');
        return newParams;
      });
    },
    [setSearchParams]
  );

  return {
    filterValues,
    handleFiltersChange,
    toggleSort,
    resetFilters,
    handleNext,
    handlePrevious,
    handleFirst,
    handleNavigationAfterDelete,
  };
};
