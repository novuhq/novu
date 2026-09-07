import { DirectionEnum } from '@novu/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useEnvironment } from '@/context/environment/hooks';
import { getPersistedPageSize, usePersistedPageSize } from '@/hooks/use-persisted-page-size';
import { QueryKeys } from '@/utils/query-keys';
import { buildRoute, ROUTES } from '@/utils/routes';
import { useDebounce } from '../../../hooks/use-debounce';

const SUBSCRIBERS_TABLE_ID = 'subscribers-list';

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
  limit: getPersistedPageSize(SUBSCRIBERS_TABLE_ID, 10),
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
  handlePageSizeChange: (newSize: number) => void;
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
  const { setPageSize: setPersistedPageSize } = usePersistedPageSize({
    tableId: SUBSCRIBERS_TABLE_ID,
    defaultPageSize: 10,
  });
  const { currentEnvironment } = useEnvironment();
  const location = useLocation();
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

  const isUnderSubscribersPage = useMemo(() => {
    const mainSubscribersRoute = buildRoute(ROUTES.SUBSCRIBERS, { environmentSlug: currentEnvironment?.slug ?? '' });
    return location.pathname.startsWith(mainSubscribersRoute);
  }, [location.pathname, currentEnvironment?.slug]);

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
        'limit',
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

  /**
   * Handles navigation logic after a subscriber is deleted.
   * Updates the URL search parameters and invalidates the query cache
   * for fetching subscribers if necessary.
   *
   * @param afterCursor - The cursor pointing to the next set of subscribers
   *                      after the deletion.
   *
   * The function performs the following:
   * - Checks if the current page is the first page or if the navigation
   *   would result in staying on the same page.
   * - If staying on the same page or on the first page, it invalidates
   *   the query cache for re-fetching subscribers.
   * - Otherwise, it updates the URL search parameters to navigate to
   *   the appropriate page after deletion which then re-fetches automatically.
   */
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

    /**
     * Why are `afterCursor` and `includeCursor` needed?
     *
     * On deletion, switch to `after` pagination to avoid fetching items from the previous page.
     * Use `includeCursor=true` to ensure the first item (after cursor) is included in the result.
     * This prevents skipping the first item on the current page after a deletion.
     *
     * Example:
     * - From page 3, click the previous button to go to page 2.
     * - Page 2 initially has items with IDs: 11 → 20 (before cursor = 21).
     * - After deleting item 12:
     *   - Remove the `before` cursor from the URL and add the `after` cursor
     *     (set to the first element in the list).
     *   - Without `includeCursor`: Page 2 → 13 → 20, 21 ❌ (skips item 11).
     *   - With `includeCursor`: Page 2 → 11, 13 → 20, 21 ✅ (includes item 11).
     */
    newParams.set('after', afterCursor);
    newParams.set('includeCursor', 'true');
    /**
     * Why delete the `before` cursor?
     * - When using `before` pagination, the query fetches items *before* the cursor, which can
     *   include items from the previous page.
     * - After deleting an item, keeping the `before` cursor causes the page to incorrectly
     *   include an item from the previous page.
     * - Deleting the `before` cursor and switching to `after` pagination ensures that the
     *   next item (from the current page or beyond) is fetched instead.
     */
    newParams.delete('before');

    if (isUnderSubscribersPage) {
      navigate(`${buildRoute(ROUTES.SUBSCRIBERS, { environmentSlug: currentEnvironment?.slug ?? '' })}?${newParams}`, {
        replace: true,
      });
    } else {
      navigate(`${location.pathname}?${newParams}`, { replace: true });
    }
  };

  const handlePageSizeChange = useCallback(
    (newSize: number) => {
      setPersistedPageSize(newSize);
      updateSearchParams({
        ...filterValues,
        limit: newSize,
      });
    },
    [updateSearchParams, filterValues, setPersistedPageSize]
  );

  return {
    filterValues,
    handleFiltersChange: debouncedUpdateParams,
    resetFilters,
    toggleSort,
    handleNext,
    handlePrevious,
    handleFirst,
    handleNavigationAfterDelete,
    handlePageSizeChange,
  };
}
