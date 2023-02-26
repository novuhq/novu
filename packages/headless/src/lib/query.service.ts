import {
  QueryClient,
  QueryKey,
  QueryObserver,
  QueryObserverOptions,
  QueryObserverResult,
  MutationObserver,
  MutationObserverOptions,
  MutationObserverResult,
} from '@tanstack/query-core';

export class QueryService {
  private queryClient: QueryClient;

  constructor(queryClient?: QueryClient) {
    this.queryClient = queryClient ?? new QueryClient();
    this.queryClient.mount();
  }

  public subscribeQuery<
    TQueryFnData = unknown,
    TError = unknown,
    TData = TQueryFnData,
    TQueryData = TQueryFnData,
    TQueryKey extends QueryKey = QueryKey
  >({
    options,
    listener,
  }: {
    options: QueryObserverOptions<
      TQueryFnData,
      TError,
      TData,
      TQueryData,
      TQueryKey
    >;
    listener: (result: QueryObserverResult<TData>) => void;
  }) {
    const defaultedOptions = this.queryClient.defaultQueryOptions(options);
    const queryObserver = new QueryObserver(this.queryClient, defaultedOptions);
    const result = queryObserver.getOptimisticResult(defaultedOptions);
    const unsubscribe = queryObserver.subscribe(listener);

    return { result, unsubscribe, queryObserver };
  }

  public subscribeMutation<
    TData = unknown,
    TError = unknown,
    TVariables = void,
    TContext = unknown
  >({
    options,
    listener,
  }: {
    options: MutationObserverOptions<TData, TError, TVariables, TContext>;
    listener: (
      result: MutationObserverResult<TData, TError, TVariables, TContext>
    ) => void;
  }) {
    const defaultedOptions = this.queryClient.defaultMutationOptions(options);
    const mutationObserver = new MutationObserver(
      this.queryClient,
      defaultedOptions
    );
    const result = mutationObserver.getCurrentResult();
    const unsubscribe = mutationObserver.subscribe(listener);

    return { result, unsubscribe, mutationObserver };
  }
}
