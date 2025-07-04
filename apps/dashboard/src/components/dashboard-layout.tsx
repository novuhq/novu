import { ReactNode } from 'react';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { SideNavigation } from '@/components/side-navigation/side-navigation';
import { HeaderNavigation } from '@/components/header-navigation/header-navigation';

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
      {showSideNavigation && <SideNavigation />}
      <div className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
        <HeaderNavigation startItems={headerStartItems} hideBridgeUrl={!showBridgeUrl} />

        <div className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden">{children}</div>
      </div>
    </div>
  );
};
