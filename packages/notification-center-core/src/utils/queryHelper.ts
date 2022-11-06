import { QueryKey, QueryObserver, QueryObserverOptions, QueryObserverResult } from '@tanstack/query-core';
import queryClient from './queryClient';

export class QueryHelper {
  public static subscribe<
    TQueryFnData = unknown,
    TError = unknown,
    TData = TQueryFnData,
    TQueryData = TQueryFnData,
    TQueryKey extends QueryKey = QueryKey
  >({
    options,
    listener,
  }: {
    options: QueryObserverOptions<TQueryFnData, TError, TData, TQueryData, TQueryKey>;
    listener: (result: QueryObserverResult<TData>) => void;
  }) {
    const defaultedOptions = queryClient.defaultQueryOptions(options);
    const queryObserver = new QueryObserver(queryClient, defaultedOptions);
    const result = queryObserver.getOptimisticResult(defaultedOptions);
    const unsubscribe = queryObserver.subscribe(listener);

    return { result, unsubscribe, queryObserver };
  }
}
