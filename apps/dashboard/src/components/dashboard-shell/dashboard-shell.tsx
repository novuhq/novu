import { ReactNode, useEffect, useState } from 'react';
import { HeaderNavigation } from '@/components/header-navigation/header-navigation';
import { MobileDesktopPrompt } from '@/components/mobile-desktop-prompt';
import { DispatchSideNavigation } from '@/components/side-navigation/dispatch-side-navigation';
import { LegacySideNavigation } from '@/components/side-navigation/side-navigation';
import { useCurrentApp } from '@/hooks/use-current-app';
import { APP_IDS, type AppId } from '@/utils/apps';
import { cn } from '@/utils/ui';
import { AppRail } from './app-rail';

type DashboardShellProps = {
  children: ReactNode;
  headerStartItems?: ReactNode;
  showSideNavigation?: boolean;
  showBridgeUrl?: boolean;
};

// Each page renders its own DashboardShell, so the side nav remounts on every
// navigation. We track the last-seen app at module scope so that on remount we
// can detect an app switch and animate only in that case.
let lastSeenAppId: AppId | undefined;

function useDidAppJustSwitch(appId: AppId): boolean {
  const [previousAppId] = useState(() => lastSeenAppId);

  useEffect(() => {
    lastSeenAppId = appId;
  }, [appId]);

  return previousAppId !== undefined && previousAppId !== appId;
}

export function DashboardShell({
  children,
  headerStartItems,
  showSideNavigation = true,
  showBridgeUrl = true,
}: DashboardShellProps) {
  const appId = useCurrentApp();
  const didAppJustSwitch = useDidAppJustSwitch(appId);
  const SideNav = appId === APP_IDS.DISPATCH ? DispatchSideNavigation : LegacySideNavigation;

  return (
    <div className="relative flex h-full w-full bg-bg-muted">
      <AppRail />
      {showSideNavigation && (
        <div className="hidden md:block my-2 rounded-md bg-bg-weak">
          <div
            key={appId}
            className={cn(
              'h-full',
              didAppJustSwitch &&
                'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-left-4 motion-safe:duration-300 motion-safe:ease-out'
            )}
          >
            <SideNav />
          </div>
        </div>
      )}
      <div className="flex flex-1 flex-col m-2 overflow-y-auto overflow-x-hidden bg-bg-white rounded-md">
        <HeaderNavigation
          startItems={headerStartItems}
          hideBridgeUrl={!showBridgeUrl || appId === APP_IDS.DISPATCH}
          showMobileNav={showSideNavigation}
          hideRestItems
        />
        <div className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden p-2">{children}</div>
      </div>
      <MobileDesktopPrompt />
    </div>
  );
}
