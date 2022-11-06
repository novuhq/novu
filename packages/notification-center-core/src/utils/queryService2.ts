import { QueryKey, QueryObserver, QueryObserverOptions, QueryObserverResult } from '@tanstack/query-core';
import queryClient from './queryClient';

export class QueryService {
  private unsubscribeMap = new Map<string, () => void>();

  public createQueryObserver<
    TQueryFnData = unknown,
    TError = unknown,
    TData = TQueryFnData,
    TQueryData = TQueryFnData,
    TQueryKey extends QueryKey = QueryKey
  >({
    options,
    subscribe,
  }: {
    options: QueryObserverOptions<TQueryFnData, TError, TData, TQueryData, TQueryKey>;
    subscribe: (result: QueryObserverResult<TData>) => void;
  }) {
    const defaultedOptions = queryClient.defaultQueryOptions(options);
    const queryObserver = new QueryObserver(queryClient, defaultedOptions);

    this.resubscribe(defaultedOptions.queryHash, queryObserver, subscribe);

    return queryObserver.getOptimisticResult(defaultedOptions);
  }

  unsubscribeAll() {
    this.unsubscribeMap.forEach((unsubscribe) => unsubscribe());
  }

  private resubscribe(
    queryHash: string,
    queryObserver: QueryObserver,
    subscribe: (result: QueryObserverResult) => void
  ) {
    const oldUnsubscribe = this.unsubscribeMap.get(queryHash);
    oldUnsubscribe?.();

    this.unsubscribeMap.set(queryHash, queryObserver.subscribe(subscribe));
  }
}

export default QueryService;
