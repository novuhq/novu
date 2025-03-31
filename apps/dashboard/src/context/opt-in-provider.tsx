import { PropsWithChildren, useEffect } from 'react';
import { NewDashboardOptInStatusEnum } from '@novu/shared';
import { useNewDashboardOptIn } from '@/hooks/use-new-dashboard-opt-in';

export const OptInProvider = (props: PropsWithChildren) => {
  const { children } = props;
  const { status, isLoaded, redirectToLegacyDashboard } = useNewDashboardOptIn();

  useEffect(() => {
    // set light theme on the new domain for both legacy and new dashboard
    localStorage.setItem('mantine-theme', 'light');
  }, []);

  if (isLoaded && status !== NewDashboardOptInStatusEnum.OPTED_IN) {
    redirectToLegacyDashboard();

    return null;
  }

  return <>{children}</>;
};
