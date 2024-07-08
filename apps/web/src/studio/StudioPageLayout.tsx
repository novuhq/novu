import { useStudioState } from './StudioStateProvider';
import { PrivatePageLayout } from '../components/layout/components/PrivatePageLayout';
import { LocalStudioPageLayout } from '../components/layout/components/LocalStudioPageLayout';
import { ROUTES } from '../constants/routes';
import { Outlet, useLocation } from 'react-router-dom';

export function StudioPageLayout() {
  const state = useStudioState();
  const { pathname } = useLocation();

  if (pathname.startsWith(ROUTES.STUDIO_ONBOARDING)) {
    return <Outlet />;
  }

  if (state?.isLocalStudio) {
    return <LocalStudioPageLayout />;
  }

  return <PrivatePageLayout />;
}
