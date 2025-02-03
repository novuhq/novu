import { DirectionEnum } from '@novu/shared';
import { useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDebounce } from '../hooks/use-debounce';

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
}

type UseSubscribersUrlStateProps = {
  after?: string;
  before?: string;
  debounceMs: number;
};

export function useSubscribersUrlState(props: UseSubscribersUrlStateProps): SubscribersUrlState {
  const { after, before, debounceMs } = props;
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
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

    newParams.set('after', after);

    navigate(`${location.pathname}?${newParams}`);
  };

  const handlePrevious = () => {
    if (!before) return;

    const newParams = new URLSearchParams(searchParams);
    newParams.delete('after');

    newParams.set('before', before);

    navigate(`${location.pathname}?${newParams}`);
  };

  const handleFirst = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('after');
    newParams.delete('before');
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
  };
}
