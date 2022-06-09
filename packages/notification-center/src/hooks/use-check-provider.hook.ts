export function useProviderCheck<T>(context: T) {
  if (context === null || context === undefined) {
    throw new Error('Component must be wrapped within the NovuProvider');
  }

  return context;
}
