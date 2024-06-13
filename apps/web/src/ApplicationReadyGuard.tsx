import { type PropsWithChildren, useLayoutEffect } from 'react';
import { useAuth } from './hooks/useAuth';

export function ApplicationReadyGuard({ children }: PropsWithChildren<{}>) {
  const { isLoading, inPublicRoute } = useAuth();

  // Clean up the skeleton loader when the app is ready
  useLayoutEffect(() => {
    if (inPublicRoute || !isLoading) {
      document.getElementById('loader')?.remove();
    }
  }, [inPublicRoute, isLoading]);

  if (inPublicRoute || !isLoading) {
    return <>{children}</>;
  }

  return null;
}
