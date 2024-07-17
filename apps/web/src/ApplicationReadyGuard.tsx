import { Navigate, useLocation } from 'react-router-dom';
import { type PropsWithChildren, useLayoutEffect } from 'react';
import { useAuth, useEnvironment } from './hooks';
import { isStudioRoute } from './studio/utils/routing';

export function ApplicationReadyGuard({ children }: PropsWithChildren<{}>) {
  const location = useLocation();
  const { isLoading: isLoadingAuth, inPublicRoute } = useAuth();
  const { isLoading: isLoadingEnvironment } = useEnvironment();

  const isLoading = isLoadingAuth || (isStudioRoute(location.pathname) && isLoadingEnvironment);

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
