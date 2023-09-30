/**
 * Custom hook to check if the context Consumer is wrapped inside the ContextProvider
 * @param context
 * @returns context
 */

export function useProviderCheck<T>(context: T): T {
  if (context === null || context === undefined) {
    throw new Error(
      'Component must be wrapped within the NovuProvider before using hooks from @novu/notification-center'
    );
  }

  return context;
}
