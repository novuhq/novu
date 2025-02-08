import { useCallback } from 'react';
import { useUser } from '@clerk/clerk-react';
import { NewDashboardOptInStatusEnum } from '@novu/shared';

import { NEW_DASHBOARD_URL } from '../config';
import { useSegment } from '../components/providers/SegmentProvider';

export function useNewDashboardOptIn() {
  const { user, isLoaded } = useUser();
  const segment = useSegment();

  const updateUserOptInStatus = useCallback(
    async (status: NewDashboardOptInStatusEnum) => {
      if (!user) return;

      await user.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          newDashboardOptInStatus: status,
          newDashboardFirstVisit: true,
        },
      });
    },
    [user]
  );

  const redirectToNewDashboard = useCallback(() => {
    window.location.href = NEW_DASHBOARD_URL || window.location.origin;
  }, []);

  const optIn = useCallback(async () => {
    segment.track('New dashboard opt-in');
    await updateUserOptInStatus(NewDashboardOptInStatusEnum.OPTED_IN);
    localStorage.setItem('mantine-theme', 'light');
    redirectToNewDashboard();
  }, [segment, updateUserOptInStatus, redirectToNewDashboard]);

  const dismiss = useCallback(() => {
    segment.track('New dashboard opt-in dismissed');
    updateUserOptInStatus(NewDashboardOptInStatusEnum.DISMISSED);
  }, [segment, updateUserOptInStatus]);

  return {
    isLoaded,
    optIn,
    dismiss,
    status: user?.unsafeMetadata?.newDashboardOptInStatus as NewDashboardOptInStatusEnum | null | undefined,
  };
}
