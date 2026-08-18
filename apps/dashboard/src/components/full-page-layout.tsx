import { ReactNode } from 'react';
import { HeaderNavigation } from '@/components/header-navigation/header-navigation';
import { MobileDesktopPrompt } from '@/components/mobile-desktop-prompt';
import { PageHeaderSlot } from '@/context/page-header';

export const FullPageLayout = ({
  children,
  headerStartItems,
}: {
  children: ReactNode;
  headerStartItems?: ReactNode;
}) => {
  return (
    <div className="relative flex h-full w-full">
      <div className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
        <HeaderNavigation startItems={headerStartItems ?? <PageHeaderSlot />} hideBridgeUrl />

        <div className="relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden">{children}</div>
      </div>
      <MobileDesktopPrompt />
    </div>
  );
};
