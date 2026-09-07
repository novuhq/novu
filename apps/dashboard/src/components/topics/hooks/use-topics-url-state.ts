import { DirectionEnum } from '@novu/shared';
import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getPersistedPageSize, usePersistedPageSize } from '@/hooks/use-persisted-page-size';

const TOPICS_TABLE_ID = 'topics-list';

export type TopicsSortableColumn = '_id' | 'updatedAt' | 'name';

export interface TopicsFilter {
  key?: string;
  name?: string;
  before?: string;
  after?: string;
  orderBy?: TopicsSortableColumn;
  orderDirection?: DirectionEnum;
  limit?: number;
  includeCursor?: boolean;
  nextCursor?: string;
  previousCursor?: string;
}

export interface TopicsUrlState {
  filterValues: TopicsFilter;
  toggleSort: (column: TopicsSortableColumn) => void;
  handleFiltersChange: (filter: Partial<TopicsFilter>) => void;
  resetFilters: () => void;
  handleNext: () => void;
  handlePrevious: () => void;
  handleFirst: () => void;
  handlePageSizeChange: (newSize: number) => void;
}

const DEFAULT_LIMIT = getPersistedPageSize(TOPICS_TABLE_ID, 10);

export const useTopicsUrlState = (): TopicsUrlState => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [previousCursor, setPreviousCursor] = useState<string | undefined>(undefined);
  const { setPageSize: setPersistedPageSize } = usePersistedPageSize({
    tableId: TOPICS_TABLE_ID,
    defaultPageSize: 10,
  });

  const key = searchParams.get('key') || '';
  const name = searchParams.get('name') || '';
  const orderBy = (searchParams.get('orderBy') as TopicsSortableColumn) || undefined;
  const orderDirection = (searchParams.get('orderDirection') as DirectionEnum) || undefined;
  const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : DEFAULT_LIMIT;
  const urlAfter = searchParams.get('after') || undefined;
  const urlBefore = searchParams.get('before') || undefined;

  const defaultFilterValues: TopicsFilter = useMemo(
    () => ({
      key: key || undefined,
      name: name || undefined,
      orderBy,
      orderDirection,
      limit,
    }),
    [key, name, orderBy, orderDirection, limit]
  );

  const toggleSort = useCallback(
    (column: TopicsSortableColumn) => {
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
    (filter: Partial<TopicsFilter>) => {
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

        if ('key' in filter) {
          if (filter.key) {
            prev.set('key', filter.key);
          } else {
            prev.delete('key');
          }
        }

        if ('name' in filter) {
          if (filter.name) {
            prev.set('name', filter.name);
          } else {
            prev.delete('name');
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
      prev.delete('key');
      prev.delete('name');
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
      prev.delete('before');
      prev.delete('after');

      return prev;
    });
  }, [setSearchParams]);

  const handlePageSizeChange = useCallback(
    (newSize: number) => {
      setPersistedPageSize(newSize);
      setNextCursor(undefined);
      setPreviousCursor(undefined);
      setSearchParams((prev) => {
        prev.set('limit', newSize.toString());
        prev.delete('before');
        prev.delete('after');

        return prev;
      });
    },
    [setSearchParams, setPersistedPageSize]
  );

  return {
    filterValues: {
      ...defaultFilterValues,
      before: urlBefore,
      after: urlAfter,
      nextCursor,
      previousCursor,
    },
    toggleSort,
    handleFiltersChange,
    resetFilters,
    handleNext,
    handlePrevious,
    handleFirst,
    handlePageSizeChange,
  };
};
