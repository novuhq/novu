import { DirectionEnum } from '@novu/shared';
import { useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDebounce } from '../../../hooks/use-debounce';
import { useQueryClient } from '@tanstack/react-query';
import { QueryKeys } from '@/utils/query-keys';

export type SubscribersSortableColumn = '_id' | 'updatedAt';
export interface SubscribersFilter {
  email?: string;
  phone?: string;
  name?: string;
  subscriberId?: string;
  limit?: number;
  after?: string;
  before?: string;
  orderBy?: SubscribersSortableColumn;
  orderDirection?: DirectionEnum;
}

export const defaultSubscribersFilter: Required<SubscribersFilter> = {
  email: '',
  phone: '',
  name: '',
  subscriberId: '',
  limit: 10,
  after: '',
  before: '',
  orderBy: '_id',
  orderDirection: DirectionEnum.DESC,
};

export interface SubscribersUrlState {
  filterValues: SubscribersFilter;
  handleFiltersChange: (data: SubscribersFilter) => void;
  resetFilters: () => void;
  toggleSort: (column: SubscribersSortableColumn) => void;
  handleNext: () => void;
  handlePrevious: () => void;
  handleFirst: () => void;
  handleNavigationAfterDelete: (afterCursor: string) => void;
}

type UseSubscribersUrlStateProps = {
  after?: string | null;
  before?: string | null;
  debounceMs?: number;
};

export function useSubscribersUrlState(props: UseSubscribersUrlStateProps = {}): SubscribersUrlState {
  const { after, before, debounceMs = 300 } = props;
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const filterValues = useMemo(
    () => ({
      email: searchParams.get('email') || '',
      phone: searchParams.get('phone') || '',
      name: searchParams.get('name') || '',
      subscriberId: searchParams.get('subscriberId') || '',
      limit: parseInt(searchParams.get('limit') || defaultSubscribersFilter.limit.toString(), 10),
      after: searchParams.get('after') || '',
      before: searchParams.get('before') || '',
      orderBy: (searchParams.get('orderBy') as SubscribersSortableColumn) || defaultSubscribersFilter.orderBy,
      orderDirection: (searchParams.get('orderDirection') as DirectionEnum) || DirectionEnum.DESC,
      includeCursor: searchParams.get('includeCursor') || '',
    }),
    [searchParams]
  );

  const updateSearchParams = useCallback(
    (data: SubscribersFilter) => {
      const newParams = new URLSearchParams(searchParams.toString());

      const resetPaginationFilterKeys: (keyof SubscribersFilter)[] = [
        'phone',
        'subscriberId',
        'email',
        'name',
        'orderBy',
        'orderDirection',
      ];

      const isResetPaginationFilterChanged = resetPaginationFilterKeys.some((key) => data[key] !== filterValues[key]);

      if (isResetPaginationFilterChanged) {
        newParams.delete('after');
        newParams.delete('before');
      }

      Object.entries(data).forEach(([key, value]) => {
        const typedKey = key as keyof SubscribersFilter;
        const defaultValue = defaultSubscribersFilter[typedKey];

        const shouldInclude =
          value &&
          value !== defaultValue &&
          !(isResetPaginationFilterChanged && (typedKey === 'after' || typedKey === 'before'));

        if (shouldInclude) {
          newParams.set(key, value.toString());
        } else {
          newParams.delete(key);
        }
      });

      setSearchParams(newParams, { replace: true });
    },
    [setSearchParams, filterValues, searchParams]
  );

  const resetFilters = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [setSearchParams]);

  const debouncedUpdateParams = useDebounce(updateSearchParams, debounceMs);

  const toggleSort = useCallback(
    (column: SubscribersSortableColumn) => {
      const newDirection =
        column === filterValues.orderBy
          ? filterValues.orderDirection === DirectionEnum.DESC
            ? DirectionEnum.ASC
            : DirectionEnum.DESC
          : DirectionEnum.DESC;

      updateSearchParams({
        ...filterValues,
        orderDirection: newDirection,
        orderBy: column,
      });
    },
    [updateSearchParams, filterValues]
  );

  const handleNext = () => {
    if (!after) return;

    const newParams = new URLSearchParams(searchParams);
    newParams.delete('before');
    newParams.delete('includeCursor');

    newParams.set('after', after);

    navigate(`${location.pathname}?${newParams}`);
  };

  const handlePrevious = () => {
    if (!before) return;

    const newParams = new URLSearchParams(searchParams);
    newParams.delete('after');
    newParams.delete('includeCursor');

    newParams.set('before', before);

    navigate(`${location.pathname}?${newParams}`);
  };

  const handleFirst = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('after');
    newParams.delete('before');
    newParams.delete('includeCursor');
    navigate(`${location.pathname}?${newParams}`, { replace: true });
  };

  const handleNavigationAfterDelete = (afterCursor: string) => {
    const newParams = new URLSearchParams(searchParams);
    const currentIncludeCursor = searchParams.get('includeCursor');
    const currentAfterCursor = searchParams.get('after');
    const currentBeforeCursor = searchParams.get('before');
    const isFirstPage = !currentBeforeCursor && !currentAfterCursor;
    const isSamePage = currentIncludeCursor === 'true' && currentAfterCursor === afterCursor;

    if (isSamePage || isFirstPage) {
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.fetchSubscribers],
      });

      return;
    }

    newParams.delete('before');
    newParams.set('after', afterCursor);
    newParams.set('includeCursor', 'true');
    navigate(`${location.pathname}?${newParams}`, { replace: true });
  };

  return {
    filterValues,
    handleFiltersChange: debouncedUpdateParams,
    resetFilters,
    toggleSort,
    handleNext,
    handlePrevious,
    handleFirst,
    handleNavigationAfterDelete,
  };
}
