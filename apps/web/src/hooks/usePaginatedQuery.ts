import { QueryFunction, QueryKey, UseQueryOptions, useQuery } from '@tanstack/react-query';
import {
  IUsePaginationQueryParamsStateOptions,
  usePaginationQueryParamsState,
  IUseSearchQueryParamStateOptions,
  useSearchQueryParamState,
} from '@novu/design-system';
import { IPaginationWithQueryParams } from '@novu/shared';

type IPaginatedQueryContext = Required<IPaginationWithQueryParams>;

/** Enhanced query function with pagination context */
type TPaginatedQueryFunction<TResponse extends object> = (ctx: IPaginatedQueryContext) => QueryFunction<TResponse>;

const calculateTotalPageCount = ({
  totalItemCount,
  pageSizeQueryParam,
}: {
  totalItemCount: number | undefined;
  pageSizeQueryParam: number;
}) => (totalItemCount === undefined ? undefined : Math.ceil(totalItemCount / pageSizeQueryParam));

export interface UsePaginatedQueryProps<TResponse extends object> {
  queryKey: QueryKey | ((paginationCtx: IPaginatedQueryContext) => QueryKey);
  buildQueryFn: TPaginatedQueryFunction<TResponse>;
  /** Return the *total* number of items for the query */
  getTotalItemCount: (resp: TResponse) => number;
  queryOptions?: Omit<UseQueryOptions<TResponse>, 'queryKey' | 'queryFn'>;
  paginationOptions?: IUsePaginationQueryParamsStateOptions & IUseSearchQueryParamStateOptions;
}

export const usePaginatedQuery = <TResponse extends object>({
  queryKey,
  buildQueryFn,
  queryOptions,
  getTotalItemCount,
  paginationOptions = {},
}: UsePaginatedQueryProps<TResponse>) => {
  const { currentPageNumberQueryParam, pageSizeQueryParam, setCurrentPageNumberQueryParam, setPageSizeQueryParam } =
    usePaginationQueryParamsState(paginationOptions);
  const { searchQueryParam, setSearchQueryParam } = useSearchQueryParamState(paginationOptions);
  const page = currentPageNumberQueryParam - 1;

  const paginationParams = { page, limit: pageSizeQueryParam, query: searchQueryParam };
  const queryKeyToUse =
    typeof queryKey === 'function'
      ? queryKey(paginationParams)
      : [...queryKey, page, pageSizeQueryParam, searchQueryParam];

  // hydrate the function with the pagination context so that the caller can include it in the request
  const hydratedQueryFn = buildQueryFn(paginationParams);

  const queryResponse = useQuery<TResponse>(queryKeyToUse, hydratedQueryFn, queryOptions);

  const totalItemCount = queryResponse.data ? getTotalItemCount(queryResponse.data) : undefined;
  const totalPageCount = calculateTotalPageCount({ totalItemCount, pageSizeQueryParam });

  const setSearchQueryParamCallback = (search: string) => {
    setSearchQueryParam(search);
    setCurrentPageNumberQueryParam(1);
  };

  return {
    // return all the React Query fields so that the caller can use them
    ...queryResponse,
    // forward the pagination state
    totalItemCount,
    totalPageCount,
    currentPageNumberQueryParam,
    pageSizeQueryParam,
    searchQueryParam,
    setCurrentPageNumberQueryParam,
    setPageSizeQueryParam,
    setSearchQueryParam: setSearchQueryParamCallback,
  };
};
