import { ReactNode } from 'react';
import { CopilotDockSlot } from '@/components/copilot-web-chat/copilot-dock-slot';
import { HeaderNavigation } from '@/components/header-navigation/header-navigation';
import { MobileDesktopPrompt } from '@/components/mobile-desktop-prompt';

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
        <HeaderNavigation startItems={headerStartItems} hideBridgeUrl />

        <div className="flex min-h-0 flex-1">
          <div className="relative flex min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">{children}</div>
          <CopilotDockSlot />
        </div>
      </div>
      <MobileDesktopPrompt />
    </div>
  );
};
