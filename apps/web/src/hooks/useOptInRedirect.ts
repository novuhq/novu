import { useCallback, useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { NewDashboardOptInStatusEnum } from '@novu/shared';

import { useNewDashboardOptIn } from './useNewDashboardOptIn';
import { ROUTES } from '../constants/routes';
import { IS_EE_AUTH_ENABLED, NEW_DASHBOARD_URL } from '../config';
import { useEnvironment } from './useEnvironment';

export const useOptInRedirect = () => {
  const { pathname } = useLocation();
  const { environment } = useEnvironment();
  const { status, isLoaded } = useNewDashboardOptIn();

  const getNewDashboardUrl = useCallback(
    (currentRoute: string): string | undefined => {
      const newDashboardUrl = NEW_DASHBOARD_URL || window.location.origin;

      switch (currentRoute) {
        case ROUTES.GET_STARTED:
          return `${newDashboardUrl}/env/${environment?.slug}/welcome`;
        case ROUTES.WORKFLOWS:
          return `${newDashboardUrl}/env/${environment?.slug}/workflows`;
        case ROUTES.ACTIVITIES:
          return `${newDashboardUrl}/env/${environment?.slug}/activity-feed`;
        case ROUTES.INTEGRATIONS:
          return `${newDashboardUrl}/integrations`;
        case ROUTES.API_KEYS:
          return `${newDashboardUrl}/env/${environment?.slug}/api-keys`;
        default:
          return undefined;
      }
    },
    [environment]
  );

  const checkAndRedirect = useCallback(() => {
    if (!IS_EE_AUTH_ENABLED) return false;
    if (!isLoaded || !status || status !== NewDashboardOptInStatusEnum.OPTED_IN) return false;

    const newDashboardUrl = getNewDashboardUrl(pathname.replace('/legacy', ''));
    if (newDashboardUrl) {
      window.location.href = newDashboardUrl;

      return true;
    }

    return false;
  }, [isLoaded, status, pathname, getNewDashboardUrl]);

  // handling of updates to deps
  useLayoutEffect(() => {
    checkAndRedirect();
  }, [checkAndRedirect]);

  // immediate redirect check for initial render
  return checkAndRedirect();
};
