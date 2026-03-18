import { ReactNode } from 'react';
import { HeaderNavigation } from '@/components/header-navigation/header-navigation';
import { MobileDesktopPrompt } from '@/components/mobile-desktop-prompt';
// @ts-ignore
import { SideNavigation } from '@/components/side-navigation/side-navigation';

export const DashboardLayout = ({
  children,
  headerStartItems,
  showSideNavigation = true,
  showBridgeUrl = true,
}: {
  children: ReactNode;
  headerStartItems?: ReactNode;
  showSideNavigation?: boolean;
  showBridgeUrl?: boolean;
}) => {
  return (
    <div className="relative flex h-full w-full">
      {showSideNavigation && (
        <div className="hidden md:block">
          <SideNavigation />
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
