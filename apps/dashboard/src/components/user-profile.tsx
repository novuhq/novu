import { UserButton, useOrganization } from '@clerk/clerk-react';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { useMemo } from 'react';
import { RiSignpostFill } from 'react-icons/ri';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useNewDashboardOptIn } from '@/hooks/use-new-dashboard-opt-in';
import { ROUTES } from '../utils/routes';

export function UserProfile() {
  const { organization } = useOrganization();
  const isLegacySelectorButtonVisible = useFeatureFlag(FeatureFlagsKeysEnum.IS_LEGACY_SELECTOR_BUTTON_VISIBLE);

  const shouldShowLegacyButton = useMemo(
    () => organization && (organization.createdAt < new Date('2024-12-24') || isLegacySelectorButtonVisible),
    [organization, isLegacySelectorButtonVisible]
  );

  const { optOut } = useNewDashboardOptIn();

  /**
   * Required duplication due to clerk fails to re-render based on child components changes
   */
  if (shouldShowLegacyButton) {
    return (
      <UserButton
        key="legacy"
        userProfileUrl={ROUTES.SETTINGS_ACCOUNT}
        appearance={{
          elements: {
            avatarBox: 'h-6 w-6',
            userButtonTrigger: 'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
          },
        }}
      >
        <UserButton.MenuItems>
          <UserButton.Action
            label="Go back to legacy V0 Dashboard"
            labelIcon={<RiSignpostFill size="16" color="var(--nv-colors-typography-text-main)" />}
            onClick={optOut}
          />
        </UserButton.MenuItems>
      </UserButton>
    );
  } else {
    return (
      <UserButton
        key="new"
        userProfileUrl={ROUTES.SETTINGS_ACCOUNT}
        appearance={{
          elements: {
            avatarBox: 'h-6 w-6',
            userButtonTrigger: 'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
          },
        }}
      ></UserButton>
    );
  }
}
