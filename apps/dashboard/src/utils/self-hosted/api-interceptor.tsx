import { getValidJwtToken, refreshJwt } from './jwt-manager';

/**
 * Wraps an API request function to ensure a valid JWT token is used
 * @param apiFunction The API function to wrap
 * @returns A wrapped function that ensures a valid JWT token is used
 */
export function withJwtValidation<T extends (...args: any[]) => Promise<any>>(
  apiFunction: T
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  return async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    try {
      await getValidJwtToken();

      return await apiFunction(...args);
    } catch (error: any) {
      if (error?.status === 401) {
        await refreshJwt();

        return await apiFunction(...args);
      }

      throw error;
    }
  };
}
