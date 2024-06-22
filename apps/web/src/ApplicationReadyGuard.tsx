import { type PropsWithChildren, useLayoutEffect } from 'react';
import { useAuth, useEnvironment } from './hooks';

export function ApplicationReadyGuard({ children }: PropsWithChildren<{}>) {
  const { isLoading: isLoadingAuth, inPublicRoute } = useAuth();
  const { isLoading: isLoadingEnvironment } = useEnvironment();

  const isLoading = isLoadingAuth || isLoadingEnvironment;

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
