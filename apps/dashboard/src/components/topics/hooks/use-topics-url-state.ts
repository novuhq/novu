import { DirectionEnum } from '@novu/shared';
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

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
}

export interface TopicsUrlState {
  filterValues: TopicsFilter;
  toggleSort: (column: TopicsSortableColumn) => void;
  handleFiltersChange: (filter: Partial<TopicsFilter>) => void;
  resetFilters: () => void;
  handleNext: () => void;
  handlePrevious: () => void;
  handleFirst: () => void;
}

const DEFAULT_LIMIT = 10;

export const useTopicsUrlState = ({ after, before }: { after?: string; before?: string }): TopicsUrlState => {
  const [searchParams, setSearchParams] = useSearchParams();

  const key = searchParams.get('key') || '';
  const name = searchParams.get('name') || '';
  const orderBy = (searchParams.get('orderBy') as TopicsSortableColumn) || undefined;
  const orderDirection = (searchParams.get('orderDirection') as DirectionEnum) || undefined;
  const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : DEFAULT_LIMIT;

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

      if (after) {
        prev.set('after', after);
      }

      return prev;
    });
  }, [after, setSearchParams]);

  const handlePrevious = useCallback(() => {
    setSearchParams((prev) => {
      prev.delete('after');

      if (before) {
        prev.set('before', before);
      }

      return prev;
    });
  }, [before, setSearchParams]);

  const handleFirst = useCallback(() => {
    setSearchParams((prev) => {
      prev.delete('before');
      prev.delete('after');

      return prev;
    });
  }, [setSearchParams]);

  return {
    filterValues: {
      ...defaultFilterValues,
      before: before || undefined,
      after: after || undefined,
    },
    toggleSort,
    handleFiltersChange,
    resetFilters,
    handleNext,
    handlePrevious,
    handleFirst,
  };
};
