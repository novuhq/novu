import { QueryFunction, QueryKey, UseQueryOptions, useQuery } from '@tanstack/react-query';
import { IUsePaginationStateOptions, usePaginationState } from '@novu/design-system';

interface IPaginatedQueryContext {
  pageSize: number;
  pageIndex: number;
}

/** Enhanced query function with pagination context */
type TPaginatedQueryFunction<TResponse extends object> = (ctx: IPaginatedQueryContext) => QueryFunction<TResponse>;

const calculateTotalPageCount = ({
  totalItemCount,
  pageSize,
}: {
  totalItemCount: number | undefined;
  pageSize: number;
}) => (totalItemCount === undefined ? undefined : Math.ceil(totalItemCount / pageSize));

export interface UsePaginatedQueryProps<TResponse extends object> {
  queryKey: QueryKey | ((paginationCtx: IPaginatedQueryContext) => QueryKey);
  buildQueryFn: TPaginatedQueryFunction<TResponse>;
  /** Return the *total* number of items for the query */
  getTotalItemCount: (resp: TResponse) => number;
  queryOptions?: Omit<UseQueryOptions<TResponse>, 'queryKey' | 'queryFn'>;
  paginationOptions?: IUsePaginationStateOptions;
}

export const usePaginatedQuery = <TResponse extends object>({
  queryKey,
  buildQueryFn,
  queryOptions,
  getTotalItemCount,
  paginationOptions = {},
}: UsePaginatedQueryProps<TResponse>) => {
  const { currentPageNumber, pageSize, setCurrentPageNumber, setPageSize } = usePaginationState(paginationOptions);
  const pageIndex = currentPageNumber - 1;

  const queryKeyToUse =
    typeof queryKey === 'function' ? queryKey({ pageIndex, pageSize }) : [...queryKey, pageIndex, pageSize];

  // hydrate the function with the pagination context so that the caller can include it in the request
  const hydratedQueryFn = buildQueryFn({ pageIndex, pageSize });

  const queryResponse = useQuery<TResponse>(queryKeyToUse, hydratedQueryFn, queryOptions);

  const totalItemCount = queryResponse.data ? getTotalItemCount(queryResponse.data) : undefined;
  const totalPageCount = calculateTotalPageCount({ totalItemCount, pageSize });

  return {
    // return all the React Query fields so that the caller can use them
    ...queryResponse,
    // forward the pagination state
    totalItemCount,
    totalPageCount,
    currentPageNumber,
    pageSize,
    setCurrentPageNumber,
    setPageSize,
  };
};
