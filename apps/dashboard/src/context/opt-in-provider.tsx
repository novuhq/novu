import { NewDashboardOptInStatusEnum } from '@novu/shared';
import { PropsWithChildren, useEffect } from 'react';
import { LEGACY_DASHBOARD_URL } from '@/config';
import { useNewDashboardOptIn } from '@/hooks/use-new-dashboard-opt-in';

export const OptInProvider = (props: PropsWithChildren) => {
  const { children } = props;
  const { status, isLoaded, redirectToLegacyDashboard, updateUserOptInStatus } = useNewDashboardOptIn();

  useEffect(() => {
    // set light theme on the new domain for both legacy and new dashboard
    localStorage.setItem('mantine-theme', 'light');
  }, []);

  if (isLoaded && status === null) {
    updateUserOptInStatus(NewDashboardOptInStatusEnum.OPTED_IN);

    return null;
  }

  // Without a legacy dashboard (self-hosted, PR boxes) there is nowhere to send an opted-out user.
  if (LEGACY_DASHBOARD_URL && isLoaded && status !== NewDashboardOptInStatusEnum.OPTED_IN) {
    redirectToLegacyDashboard();

    return null;
  }

  return <>{children}</>;
};
