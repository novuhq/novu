import { useUser } from '@clerk/clerk-react';
import { NewDashboardOptInStatusEnum } from '@novu/shared';
import { LEGACY_DASHBOARD_URL } from '@/config';
import { useTelemetry } from '@/hooks/use-telemetry';
import { TelemetryEvent } from '@/utils/telemetry';

export function useNewDashboardOptIn() {
  const { user, isLoaded } = useUser();
  const track = useTelemetry();

  const updateUserOptInStatus = async (status: NewDashboardOptInStatusEnum) => {
    if (!user) return;

    await user.update({
      unsafeMetadata: {
        ...user.unsafeMetadata,
        newDashboardOptInStatus: status,
      },
    });
  };

  const getCurrentOptInStatus = () => {
    if (!user) return null;

    return user.unsafeMetadata?.newDashboardOptInStatus || null;
  };

  const getNewDashboardFirstVisit = () => {
    if (!user) return false;

    return user.unsafeMetadata?.newDashboardFirstVisit || false;
  };

  const redirectToLegacyDashboard = () => {
    window.location.href = `${LEGACY_DASHBOARD_URL}${window.location.pathname}${window.location.search}`;
  };

  const optOut = async () => {
    track(TelemetryEvent.NEW_DASHBOARD_OPT_OUT);
    await updateUserOptInStatus(NewDashboardOptInStatusEnum.OPTED_OUT);

    window.location.href = LEGACY_DASHBOARD_URL;
  };

  const optIn = async () => {
    await updateUserOptInStatus(NewDashboardOptInStatusEnum.OPTED_IN);
  };

  return {
    isLoaded,
    optOut,
    optIn,
    status: getCurrentOptInStatus(),
    isFirstVisit: getNewDashboardFirstVisit(),
    redirectToLegacyDashboard,
    updateUserOptInStatus,
  };
}
