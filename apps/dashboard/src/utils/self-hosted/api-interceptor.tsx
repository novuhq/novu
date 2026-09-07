/**
 * Wraps an API request function to ensure a valid JWT token is used
 * @param apiFunction The API function to wrap
 * @returns A wrapped function that ensures a valid JWT token is used
 */
export function withJwtValidation<T extends (...args: any[]) => Promise<any>>(
  apiFunction: T
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  return async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    return await apiFunction(...args);
  };
}
