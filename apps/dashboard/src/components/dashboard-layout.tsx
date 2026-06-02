import { FeatureFlagsKeysEnum } from '@novu/shared';
import { ReactNode } from 'react';
import { DashboardShell } from '@/components/dashboard-shell/dashboard-shell';
import { HeaderNavigation } from '@/components/header-navigation/header-navigation';
import { MobileDesktopPrompt } from '@/components/mobile-desktop-prompt';
import { LegacySideNavigation } from '@/components/side-navigation/side-navigation';
import { IS_HOSTNAME_SPLIT_ENABLED } from '@/config';
import { useFeatureFlag } from '@/hooks/use-feature-flag';

type DashboardLayoutProps = {
  children: ReactNode;
  headerStartItems?: ReactNode;
  showSideNavigation?: boolean;
  showBridgeUrl?: boolean;
};

const LegacyDashboardLayout = ({
  children,
  headerStartItems,
  showSideNavigation = true,
  showBridgeUrl = true,
}: DashboardLayoutProps) => {
  return (
    <div className="relative flex h-full w-full">
      {showSideNavigation && (
        <div className="hidden md:block bg-neutral-alpha-50">
          <LegacySideNavigation />
        </div>
      )}
      <div className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
        <HeaderNavigation
          startItems={headerStartItems}
          hideBridgeUrl={!showBridgeUrl}
          showMobileNav={showSideNavigation}
        />

        <div className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden p-2">{children}</div>
      </div>
      <MobileDesktopPrompt />
    </div>
  );
};

export const DashboardLayout = (props: DashboardLayoutProps) => {
  const isShellV2FlagEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_CONNECT_DASHBOARD_ENABLED, false);

  // The v2 shell (AppRail + cross-product switching) only makes sense on hostname-split
  // deployments, and the LD flag gates the rollout per environment.
  if (IS_HOSTNAME_SPLIT_ENABLED && isShellV2FlagEnabled) {
    return <DashboardShell {...props} />;
  }

  return <LegacyDashboardLayout {...props} />;
};
