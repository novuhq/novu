import { DirectionEnum } from '@novu/shared';
import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getPersistedPageSize, usePersistedPageSize } from '@/hooks/use-persisted-page-size';

const CONTEXTS_TABLE_ID = 'contexts-list';

export type ContextsSortableColumn = 'createdAt' | 'updatedAt';

export type ContextsFilter = {
  search?: string;
  orderBy?: ContextsSortableColumn;
  orderDirection?: DirectionEnum;
  limit?: number;
  after?: string;
  before?: string;
  nextCursor?: string;
  previousCursor?: string;
};

export interface ContextsUrlState {
  filterValues: ContextsFilter;
  handleFiltersChange: (filter: Partial<ContextsFilter>) => void;
  resetFilters: () => void;
  toggleSort: (column: ContextsSortableColumn) => void;
  handleNext: () => void;
  handlePrevious: () => void;
  handleFirst: () => void;
  handlePageSizeChange: (newSize: number) => void;
}

const DEFAULT_LIMIT = getPersistedPageSize(CONTEXTS_TABLE_ID, 10);

export const useContextsUrlState = (): ContextsUrlState => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [previousCursor, setPreviousCursor] = useState<string | undefined>(undefined);
  const { setPageSize: setPersistedPageSize } = usePersistedPageSize({
    tableId: CONTEXTS_TABLE_ID,
    defaultPageSize: 10,
  });

  const filterValues: ContextsFilter = useMemo(() => {
    const search = searchParams.get('search') || '';
    const orderBy = (searchParams.get('orderBy') as ContextsSortableColumn) || undefined;
    const orderDirection = (searchParams.get('orderDirection') as DirectionEnum) || undefined;
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : DEFAULT_LIMIT;
    const urlAfter = searchParams.get('after') || undefined;
    const urlBefore = searchParams.get('before') || undefined;

    return {
      search: search || undefined,
      orderBy,
      orderDirection,
      limit,
      after: urlAfter,
      before: urlBefore,
      nextCursor,
      previousCursor,
    };
  }, [searchParams, nextCursor, previousCursor]);

  const toggleSort = useCallback(
    (column: ContextsSortableColumn) => {
      setSearchParams((prev) => {
        if (prev.get('orderBy') === column) {
          if (prev.get('orderDirection') === DirectionEnum.ASC) {
            prev.set('orderDirection', DirectionEnum.DESC);
          } else if (prev.get('orderDirection') === DirectionEnum.DESC) {
            prev.delete('orderBy');
            prev.delete('orderDirection');
          } else {
            prev.set('orderBy', column);
            prev.set('orderDirection', DirectionEnum.ASC);
          }
        } else {
          prev.set('orderBy', column);
          prev.set('orderDirection', DirectionEnum.ASC);
        }

        return prev;
      });
    },
    [setSearchParams]
  );

  const handleFiltersChange = useCallback(
    (filter: Partial<ContextsFilter>) => {
      // Handle cursor state updates
      if ('nextCursor' in filter) {
        setNextCursor(filter.nextCursor);
      }

      if ('previousCursor' in filter) {
        setPreviousCursor(filter.previousCursor);
      }

      setSearchParams((prev) => {
        if ('after' in filter) {
          if (filter.after) {
            prev.set('after', filter.after);
          } else {
            prev.delete('after');
          }
        }

        if ('before' in filter) {
          if (filter.before) {
            prev.set('before', filter.before);
          } else {
            prev.delete('before');
          }
        }

        if ('search' in filter) {
          if (filter.search) {
            prev.set('search', filter.search);
          } else {
            prev.delete('search');
          }
        }

        return prev;
      });
    },
    [setSearchParams]
  );

  const resetFilters = useCallback(() => {
    setNextCursor(undefined);
    setPreviousCursor(undefined);
    setSearchParams((prev) => {
      prev.delete('search');
      prev.delete('before');
      prev.delete('after');

      return prev;
    });
  }, [setSearchParams]);

  const handleNext = useCallback(() => {
    setSearchParams((prev) => {
      prev.delete('before');

      if (nextCursor) {
        prev.set('after', nextCursor);
      }

      return prev;
    });
  }, [nextCursor, setSearchParams]);

  const handlePrevious = useCallback(() => {
    setSearchParams((prev) => {
      prev.delete('after');

      if (previousCursor) {
        prev.set('before', previousCursor);
      }

      return prev;
    });
  }, [previousCursor, setSearchParams]);

  const handleFirst = useCallback(() => {
    setSearchParams((prev) => {
      prev.delete('after');
      prev.delete('before');

      return prev;
    });
  }, [setSearchParams]);

  const handlePageSizeChange = useCallback(
    (newSize: number) => {
      setPersistedPageSize(newSize);
      setSearchParams((prev) => {
        prev.set('limit', newSize.toString());
        prev.delete('after');
        prev.delete('before');

        return prev;
      });
    },
    [setSearchParams, setPersistedPageSize]
  );

  return {
    filterValues,
    handleFiltersChange,
    resetFilters,
    toggleSort,
    handleNext,
    handlePrevious,
    handleFirst,
    handlePageSizeChange,
  };
};
