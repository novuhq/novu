import { Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useStudioState } from './StudioStateProvider';
import { PrivatePageLayout } from '../components/layout/components/PrivatePageLayout';
import { LocalStudioPageLayout } from '../components/layout/components/LocalStudioPageLayout';
import { ROUTES } from '../constants/routes';

export function StudioPageLayout() {
  const state = useStudioState();
  const { pathname } = useLocation();

  useEffect(() => {
    onPathnameChangeUpdateIframeClient(pathname);
  }, [pathname]);

  if (pathname.startsWith(ROUTES.STUDIO_ONBOARDING)) {
    return <Outlet />;
  }

  if (state?.isLocalStudio) {
    return <LocalStudioPageLayout />;
  }

  return <PrivatePageLayout />;
}

function onPathnameChangeUpdateIframeClient(pathname: string) {
  window.parent.postMessage({ type: 'pathnameChange', pathname }, '*');
}
